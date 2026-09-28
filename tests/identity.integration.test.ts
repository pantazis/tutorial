import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createSessionCookie } from "@/server/auth/cookie";
import { hashOpaqueToken } from "@/server/auth/crypto";
import { recoverMasterMembership } from "@/server/auth/master-recovery";
import {
  canAccessAdministration,
  canAccessOwnAccount,
  canManageAdministrators,
} from "@/server/auth/policy";
import { parseSafeReturnTo } from "@/server/auth/safe-return";
import { isSameOriginRequest } from "@/server/auth/request-security";
import { IdentityService } from "@/server/auth/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const service = new IdentityService(pool);
const password = "A-strong-test-password-123";

async function createVerifiedAccount(
  email: string,
  language: "EL" | "EN" = "EN",
): Promise<{ accountId: string; sessionToken: string }> {
  const registration = await service.register({ email, password, preferredLanguage: language });
  if (!registration.ok) throw new Error(registration.message);
  const verificationToken = await service.issueVerificationToken(registration.value.accountId);
  const verification = await service.verifyAccount(verificationToken);
  if (!verification.ok) throw new Error(verification.message);
  const login = await service.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

beforeEach(async () => {
  await pool.query(
    "TRUNCATE security_audit, admin_invitations, auth_tokens, auth_sessions, accounts RESTART IDENTITY CASCADE",
  );
});

afterAll(async () => {
  await pool.end();
});

describe("identity and authorization core", () => {
  it("rejects direct and nested role injection and creates only user accounts", async () => {
    await expect(
      service.register({
        email: "direct@example.test",
        password,
        preferredLanguage: "EN",
        role: "master_admin",
      }),
    ).resolves.toMatchObject({ ok: false, code: "validation" });

    await expect(
      service.register({
        email: "nested@example.test",
        password,
        preferredLanguage: "EN",
        profile: { role: "admin" },
      }),
    ).resolves.toMatchObject({ ok: false, code: "validation" });

    const result = await service.register({ email: "user@example.test", password, preferredLanguage: "EL" });
    expect(result.ok).toBe(true);
    const stored = await pool.query("SELECT role, preferred_language, password_hash FROM accounts");
    expect(stored.rows[0]).toMatchObject({ role: "user", preferred_language: "EL" });
    expect(stored.rows[0].password_hash).not.toContain(password);
  });

  it("requires verification and stores only hashed, expiring, single-use tokens", async () => {
    const registration = await service.register({ email: "verify@example.test", password, preferredLanguage: "EN" });
    if (!registration.ok) throw new Error(registration.message);

    await expect(service.login({ email: "verify@example.test", password })).resolves.toMatchObject({
      ok: false,
      code: "denied",
    });

    const token = await service.issueVerificationToken(registration.value.accountId);
    const stored = await pool.query("SELECT token_hash FROM auth_tokens WHERE token_hash = $1", [hashOpaqueToken(token)]);
    expect(stored.rowCount).toBe(1);
    expect(stored.rows[0].token_hash).not.toBe(token);
    await expect(service.verifyAccount(token)).resolves.toMatchObject({ ok: true });
    await expect(service.verifyAccount(token)).resolves.toMatchObject({ ok: false, code: "invalid_token" });

    const expired = await service.issueVerificationToken(registration.value.accountId);
    await pool.query(
      `UPDATE auth_tokens
       SET created_at = statement_timestamp() - interval '2 hours',
           expires_at = statement_timestamp() - interval '1 hour'
       WHERE token_hash = $1`,
      [hashOpaqueToken(expired)],
    );
    await expect(service.verifyAccount(expired)).resolves.toMatchObject({ ok: false, code: "invalid_token" });
  });

  it("uses secure cookie attributes and revocable hashed sessions", async () => {
    const account = await createVerifiedAccount("session@example.test");
    const session = await pool.query("SELECT token_hash FROM auth_sessions");
    expect(session.rows[0].token_hash).toBe(hashOpaqueToken(account.sessionToken));
    expect(session.rows[0].token_hash).not.toBe(account.sessionToken);

    const cookie = createSessionCookie(account.sessionToken, new Date("2030-01-01T00:00:00Z"), true);
    expect(cookie.options).toMatchObject({ secure: true, httpOnly: true, sameSite: "lax", path: "/" });
    await expect(service.loadProtectedContext(account.sessionToken)).resolves.toMatchObject({ ok: true });
    await expect(service.logout(account.sessionToken)).resolves.toMatchObject({ ok: true });
    await expect(service.loadProtectedContext(account.sessionToken)).resolves.toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });

  it("rechecks current account role and status for every protected call", async () => {
    const account = await createVerifiedAccount("recheck@example.test");
    await pool.query("UPDATE accounts SET role = 'admin' WHERE id = $1", [account.accountId]);
    const roleResult = await service.loadProtectedContext(account.sessionToken);
    expect(roleResult).toMatchObject({ ok: true, value: { role: "admin" } });

    await pool.query("UPDATE accounts SET status = 'disabled' WHERE id = $1", [account.accountId]);
    await expect(service.loadProtectedContext(account.sessionToken)).resolves.toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });

  it.each([
    "https://evil.example/en/my-course",
    "//evil.example/path",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/en/%2e%2e/admin",
    "/en/login",
    "/en/admin",
    "/el/my-course",
    "/en/%252e%252e/admin",
    "/en/my-course%0d%0aSet-Cookie:x=y",
  ])("rejects unsafe return destination %s", (candidate) => {
    expect(parseSafeReturnTo(candidate, "EN")).toBeNull();
  });

  it("accepts only normalized same-locale learner destinations", () => {
    expect(parseSafeReturnTo("/en/my-course?view=active#resume", "EN")).toBe(
      "/en/my-course?view=active#resume",
    );
  });

  it("accepts only same-origin mutation requests", () => {
    expect(
      isSameOriginRequest(
        new Request("https://app.example.test/action", {
          method: "POST",
          headers: { origin: "https://app.example.test" },
        }),
        "https://app.example.test",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Request("https://app.example.test/action", {
          method: "POST",
          headers: { origin: "https://evil.example.test" },
        }),
        "https://app.example.test",
      ),
    ).toBe(false);
  });

  it("enforces self, administrator, and master scopes", async () => {
    const user = await createVerifiedAccount("scope@example.test");
    const contextResult = await service.loadProtectedContext(user.sessionToken);
    if (!contextResult.ok) throw new Error(contextResult.message);
    expect(canAccessOwnAccount(contextResult.value, user.accountId)).toBe(true);
    expect(canAccessOwnAccount(contextResult.value, randomUUID())).toBe(false);
    expect(canAccessAdministration(contextResult.value)).toBe(false);
    expect(canManageAdministrators(contextResult.value)).toBe(false);

    await pool.query("UPDATE accounts SET role = 'master_admin' WHERE id = $1", [user.accountId]);
    const masterResult = await service.loadProtectedContext(user.sessionToken);
    if (!masterResult.ok) throw new Error(masterResult.message);
    expect(canAccessAdministration(masterResult.value)).toBe(true);
    expect(canManageAdministrators(masterResult.value)).toBe(true);
  });

  it("accepts an invitation once under concurrency and reuses the current server role", async () => {
    const master = await createVerifiedAccount("master@example.test");
    await recoverMasterMembership(pool, "grant", "master@example.test");
    const learner = await createVerifiedAccount("invitee@example.test");

    const invitation = await service.inviteAdmin(master.sessionToken, "invitee@example.test");
    if (!invitation.ok) throw new Error(invitation.message);
    const [first, second] = await Promise.all([
      service.acceptAdminInvitation(learner.sessionToken, invitation.value.invitationToken),
      service.acceptAdminInvitation(learner.sessionToken, invitation.value.invitationToken),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const stored = await pool.query("SELECT role FROM accounts WHERE id = $1", [learner.accountId]);
    expect(stored.rows[0].role).toBe("admin");
  });

  it("serializes concurrent admin role changes and blocks non-master callers", async () => {
    const master = await createVerifiedAccount("master-role@example.test");
    await recoverMasterMembership(pool, "grant", "master-role@example.test");
    const target = await createVerifiedAccount("target@example.test");
    const ordinary = await createVerifiedAccount("ordinary@example.test");

    await expect(service.changeAdminRole(ordinary.sessionToken, target.accountId, "grant")).resolves.toMatchObject({
      ok: false,
      code: "denied",
    });
    const results = await Promise.all([
      service.changeAdminRole(master.sessionToken, target.accountId, "grant"),
      service.changeAdminRole(master.sessionToken, target.accountId, "revoke"),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const stored = await pool.query("SELECT role FROM accounts WHERE id = $1", [target.accountId]);
    expect(["user", "admin"]).toContain(stored.rows[0].role);
  });

  it("audits container recovery and rejects removal of the last active master", async () => {
    await createVerifiedAccount("recovery@example.test");
    await expect(recoverMasterMembership(pool, "grant", "recovery@example.test")).resolves.toMatchObject({
      ok: true,
      value: { role: "master_admin" },
    });
    await expect(recoverMasterMembership(pool, "revoke", "recovery@example.test")).resolves.toMatchObject({
      ok: false,
      code: "conflict",
    });
    const audit = await pool.query("SELECT event_type, detail FROM security_audit WHERE event_type LIKE 'master_recovery_%'");
    expect(audit.rows).toEqual([
      expect.objectContaining({ event_type: "master_recovery_granted", detail: { channel: "container_recovery" } }),
    ]);
  });

  it("revokes existing sessions after a single-use password reset", async () => {
    const account = await createVerifiedAccount("reset@example.test");
    const token = await service.issuePasswordResetToken(account.accountId);
    await expect(service.resetPassword(token, "A-new-strong-test-password-456")).resolves.toMatchObject({ ok: true });
    await expect(service.resetPassword(token, "Another-strong-test-password-789")).resolves.toMatchObject({
      ok: false,
      code: "invalid_token",
    });
    await expect(service.loadProtectedContext(account.sessionToken)).resolves.toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});