import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { withTransaction } from "@/server/db/transaction";
import type { MailTransport } from "@/server/mail/transport";

import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from "./crypto";
import { emailSchema, loginSchema, passwordSchema, registrationSchema } from "./validation";
import type { AuthenticatedContext, Language, Role, ServiceResult } from "./types";

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;
const ONE_TIME_TOKEN_LIFETIME_MS = 1000 * 60 * 60;
type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  preferred_language: Language;
  role: Role;
  status: "active" | "disabled";
  verified_at: Date | null;
};

function failure<T>(
  code: "validation" | "unauthenticated" | "denied" | "conflict" | "invalid_token" | "transient",
  message: string,
): ServiceResult<T> {
  return { ok: false, code, message };
}

async function audit(
  client: PoolClient,
  eventType: string,
  actorAccountId: string | null,
  subjectAccountId: string | null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await client.query(
    `INSERT INTO security_audit (id, actor_account_id, subject_account_id, event_type, detail)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), actorAccountId, subjectAccountId, eventType, JSON.stringify(detail)],
  );
}

async function loadAuthenticated(
  client: PoolClient,
  sessionToken: string,
  lockAccount = false,
): Promise<AuthenticatedContext | null> {
  if (!sessionToken) return null;

  const result = await client.query<AccountRow & { session_id: string }>(
    `SELECT a.id, a.email, a.preferred_language, a.role, a.status, a.verified_at,
            a.password_hash, s.id AS session_id
     FROM auth_sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > statement_timestamp()
       AND a.status = 'active'
       AND a.verified_at IS NOT NULL
     ${lockAccount ? "FOR UPDATE OF a, s" : ""}`,
    [hashOpaqueToken(sessionToken)],
  );

  const row = result.rows[0];
  if (!row) return null;

  await client.query("UPDATE auth_sessions SET last_seen_at = statement_timestamp() WHERE id = $1", [
    row.session_id,
  ]);

  return {
    accountId: row.id,
    email: row.email,
    language: row.preferred_language,
    role: row.role,
    sessionId: row.session_id,
  };
}

export class IdentityService {
  constructor(
    private readonly pool: Pool,
    private readonly mail?: MailTransport,
  ) {}

  async register(input: unknown): Promise<ServiceResult<{ accountId: string }>> {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) return failure("validation", "Registration details are invalid.");

    const accountId = randomUUID();
    const verificationToken = createOpaqueToken();
    const verificationHash = hashOpaqueToken(verificationToken);
    const passwordHash = await hashPassword(parsed.data.password);

    try {
      await withTransaction(this.pool, async (client) => {
        await client.query(
          `INSERT INTO accounts (id, email, password_hash, preferred_language, role)
           VALUES ($1, $2, $3, $4, 'user')`,
          [accountId, parsed.data.email, passwordHash, parsed.data.preferredLanguage],
        );
        await client.query(
          `INSERT INTO auth_tokens (id, account_id, purpose, token_hash, expires_at)
           VALUES ($1, $2, 'verification', $3, statement_timestamp() + interval '1 hour')`,
          [randomUUID(), accountId, verificationHash],
        );
        await audit(client, "account_registered", accountId, accountId, {
          preferredLanguage: parsed.data.preferredLanguage,
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return failure("conflict", "Registration could not be completed.");
      }
      throw error;
    }

    await this.mail?.send({
      to: parsed.data.email,
      subject: "Verify your account",
      text: `Verification token: ${verificationToken}`,
    });
    return { ok: true, value: { accountId } };
  }

  async issueVerificationToken(accountId: string, expiresAt?: Date): Promise<string> {
    const token = createOpaqueToken();
    await this.pool.query(
      `INSERT INTO auth_tokens (id, account_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, 'verification', $3, $4)`,
      [randomUUID(), accountId, hashOpaqueToken(token), expiresAt ?? new Date(Date.now() + ONE_TIME_TOKEN_LIFETIME_MS)],
    );
    return token;
  }

  async verifyAccount(token: string): Promise<ServiceResult<{ accountId: string }>> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{ id: string; account_id: string }>(
        `SELECT id, account_id
         FROM auth_tokens
         WHERE token_hash = $1 AND purpose = 'verification'
           AND consumed_at IS NULL AND expires_at > statement_timestamp()
         FOR UPDATE`,
        [hashOpaqueToken(token)],
      );
      const row = result.rows[0];
      if (!row) return failure("invalid_token", "Verification token is invalid or expired.");

      await client.query("UPDATE auth_tokens SET consumed_at = statement_timestamp() WHERE id = $1", [row.id]);
      await client.query(
        `UPDATE accounts
         SET verified_at = COALESCE(verified_at, statement_timestamp()), updated_at = statement_timestamp()
         WHERE id = $1`,
        [row.account_id],
      );
      await audit(client, "account_verified", row.account_id, row.account_id);
      return { ok: true, value: { accountId: row.account_id } };
    });
  }

  async login(
    input: unknown,
  ): Promise<ServiceResult<{ context: AuthenticatedContext; sessionToken: string; expiresAt: Date }>> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) return failure("validation", "Credentials are invalid.");

    const result = await this.pool.query<AccountRow>("SELECT * FROM accounts WHERE email = $1", [parsed.data.email]);
    const account = result.rows[0];
    if (!account || !(await verifyPassword(parsed.data.password, account.password_hash))) {
      return failure("unauthenticated", "Credentials are invalid.");
    }
    if (account.status !== "active" || !account.verified_at) {
      return failure("denied", "Account is unavailable or requires verification.");
    }

    const sessionToken = createOpaqueToken();
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    await withTransaction(this.pool, async (client) => {
      await client.query(
        `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, account.id, hashOpaqueToken(sessionToken), expiresAt],
      );
      await audit(client, "session_created", account.id, account.id, { sessionId });
    });

    return {
      ok: true,
      value: {
        sessionToken,
        expiresAt,
        context: {
          accountId: account.id,
          email: account.email,
          language: account.preferred_language,
          role: account.role,
          sessionId,
        },
      },
    };
  }

  async loadProtectedContext(sessionToken: string): Promise<ServiceResult<AuthenticatedContext>> {
    const context = await withTransaction(this.pool, (client) => loadAuthenticated(client, sessionToken));
    return context ? { ok: true, value: context } : failure("unauthenticated", "Authentication is required.");
  }

  async logout(sessionToken: string): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken, true);
      if (!context) return failure("unauthenticated", "Authentication is required.");
      await client.query("UPDATE auth_sessions SET revoked_at = statement_timestamp() WHERE id = $1", [context.sessionId]);
      await audit(client, "session_revoked", context.accountId, context.accountId, { sessionId: context.sessionId });
      return { ok: true, value: null };
    });
  }

  async requestPasswordReset(emailInput: unknown): Promise<ServiceResult<{ accepted: true }>> {
    const parsed = emailSchema.safeParse(emailInput);
    if (!parsed.success) return failure("validation", "Email is invalid.");

    const account = await this.pool.query<{ id: string; email: string }>(
      "SELECT id, email FROM accounts WHERE email = $1 AND status = 'active'",
      [parsed.data],
    );
    const row = account.rows[0];
    if (row) {
      const token = createOpaqueToken();
      await this.pool.query(
        `INSERT INTO auth_tokens (id, account_id, purpose, token_hash, expires_at)
         VALUES ($1, $2, 'password_reset', $3, statement_timestamp() + interval '1 hour')`,
        [randomUUID(), row.id, hashOpaqueToken(token)],
      );
      await this.mail?.send({ to: row.email, subject: "Reset your password", text: `Reset token: ${token}` });
    }
    return { ok: true, value: { accepted: true } };
  }

  async resetPassword(token: string, newPassword: unknown): Promise<ServiceResult<null>> {
    const parsedPassword = passwordSchema.safeParse(newPassword);
    if (!parsedPassword.success) return failure("validation", "Password is invalid.");
    const passwordHash = await hashPassword(parsedPassword.data);

    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{ id: string; account_id: string }>(
        `SELECT id, account_id FROM auth_tokens
         WHERE token_hash = $1 AND purpose = 'password_reset'
           AND consumed_at IS NULL AND expires_at > statement_timestamp()
         FOR UPDATE`,
        [hashOpaqueToken(token)],
      );
      const row = result.rows[0];
      if (!row) return failure("invalid_token", "Reset token is invalid or expired.");

      await client.query("UPDATE auth_tokens SET consumed_at = statement_timestamp() WHERE id = $1", [row.id]);
      await client.query(
        "UPDATE accounts SET password_hash = $1, updated_at = statement_timestamp() WHERE id = $2",
        [passwordHash, row.account_id],
      );
      await client.query(
        "UPDATE auth_sessions SET revoked_at = statement_timestamp() WHERE account_id = $1 AND revoked_at IS NULL",
        [row.account_id],
      );
      await audit(client, "password_reset", row.account_id, row.account_id);
      return { ok: true, value: null };
    });
  }

  async issuePasswordResetToken(accountId: string, expiresAt?: Date): Promise<string> {
    const token = createOpaqueToken();
    await this.pool.query(
      `INSERT INTO auth_tokens (id, account_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, 'password_reset', $3, $4)`,
      [randomUUID(), accountId, hashOpaqueToken(token), expiresAt ?? new Date(Date.now() + ONE_TIME_TOKEN_LIFETIME_MS)],
    );
    return token;
  }

  async inviteAdmin(sessionToken: string, emailInput: unknown): Promise<ServiceResult<{ invitationToken: string }>> {
    const email = emailSchema.safeParse(emailInput);
    if (!email.success) return failure("validation", "Email is invalid.");
    const invitationToken = createOpaqueToken();

    return withTransaction(this.pool, async (client) => {
      const actor = await loadAuthenticated(client, sessionToken, true);
      if (!actor || actor.role !== "master_admin") return failure("denied", "Operation is not permitted.");
      try {
        await client.query(
          `INSERT INTO admin_invitations (id, email, token_hash, invited_by, expires_at)
           VALUES ($1, $2, $3, $4, statement_timestamp() + interval '7 days')`,
          [randomUUID(), email.data, hashOpaqueToken(invitationToken), actor.accountId],
        );
      } catch (error) {
        if ((error as { code?: string }).code === "23505") return failure("conflict", "Invitation already exists.");
        throw error;
      }
      await audit(client, "admin_invited", actor.accountId, null, { email: email.data });
      return { ok: true, value: { invitationToken } };
    });
  }

  async acceptAdminInvitation(sessionToken: string, invitationToken: string): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const account = await loadAuthenticated(client, sessionToken, true);
      if (!account) return failure("unauthenticated", "Authentication is required.");

      const invitationResult = await client.query<{
        id: string;
        email: string;
        accepted_by: string | null;
        consumed_at: Date | null;
      }>(
        `SELECT id, email, accepted_by, consumed_at
         FROM admin_invitations WHERE token_hash = $1 FOR UPDATE`,
        [hashOpaqueToken(invitationToken)],
      );
      const invitation = invitationResult.rows[0];
      if (!invitation) return failure("invalid_token", "Invitation is invalid or expired.");
      if (invitation.consumed_at) {
        return invitation.accepted_by === account.accountId
          ? { ok: true, value: null }
          : failure("conflict", "Invitation has already been accepted.");
      }

      const valid = await client.query<{ valid: boolean }>(
        `SELECT expires_at > statement_timestamp() AS valid
         FROM admin_invitations WHERE id = $1`,
        [invitation.id],
      );
      if (!valid.rows[0]?.valid || invitation.email !== account.email) {
        return failure("invalid_token", "Invitation is invalid or expired.");
      }

      await client.query(
        `UPDATE admin_invitations
         SET consumed_at = statement_timestamp(), accepted_by = $1 WHERE id = $2`,
        [account.accountId, invitation.id],
      );
      await client.query(
        `UPDATE accounts SET role = 'admin', updated_at = statement_timestamp()
         WHERE id = $1 AND role = 'user'`,
        [account.accountId],
      );
      await audit(client, "admin_invitation_accepted", account.accountId, account.accountId, {
        invitationId: invitation.id,
      });
      return { ok: true, value: null };
    });
  }

  async changeAdminRole(
    sessionToken: string,
    subjectAccountId: string,
    action: "grant" | "revoke",
  ): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(73003)");
      const actor = await loadAuthenticated(client, sessionToken, true);
      if (!actor || actor.role !== "master_admin") return failure("denied", "Operation is not permitted.");

      const targetResult = await client.query<AccountRow>("SELECT * FROM accounts WHERE id = $1 FOR UPDATE", [
        subjectAccountId,
      ]);
      const target = targetResult.rows[0];
      if (!target || target.role === "master_admin") return failure("denied", "Operation is not permitted.");

      const nextRole = action === "grant" ? "admin" : "user";
      await client.query("UPDATE accounts SET role = $1, updated_at = statement_timestamp() WHERE id = $2", [
        nextRole,
        target.id,
      ]);
      await audit(client, action === "grant" ? "admin_granted" : "admin_revoked", actor.accountId, target.id);
      return { ok: true, value: null };
    });
  }

  landingPath(context: AuthenticatedContext): string {
    return context.role === "user" ? `/${context.language.toLowerCase()}/my-course` : "/admin";
  }
}

export function hasRole(context: AuthenticatedContext, allowed: readonly Role[]): boolean {
  return allowed.includes(context.role);
}