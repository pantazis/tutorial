import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import { withTransaction } from "@/server/db/transaction";

import { emailSchema } from "./validation";
import type { ServiceResult } from "./types";

export async function recoverMasterMembership(
  pool: Pool,
  action: "grant" | "revoke",
  emailInput: unknown,
): Promise<ServiceResult<{ email: string; role: "master_admin" | "user" }>> {
  const email = emailSchema.safeParse(emailInput);
  if (!email.success) return { ok: false, code: "validation", message: "Email is invalid." };

  return withTransaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(73003)");
    const accountResult = await client.query<{ id: string; role: string; status: string }>(
      "SELECT id, role, status FROM accounts WHERE email = $1 FOR UPDATE",
      [email.data],
    );
    const account = accountResult.rows[0];
    if (!account || account.status !== "active") {
      return { ok: false, code: "conflict", message: "Active account was not found." };
    }

    const nextRole = action === "grant" ? "master_admin" : "user";
    if (action === "revoke" && account.role === "master_admin") {
      const masters = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM accounts WHERE role = 'master_admin' AND status = 'active'",
      );
      if (Number(masters.rows[0]?.count ?? 0) <= 1) {
        return { ok: false, code: "conflict", message: "At least one active master administrator is required." };
      }
    }

    await client.query("UPDATE accounts SET role = $1, updated_at = statement_timestamp() WHERE id = $2", [
      nextRole,
      account.id,
    ]);
    await client.query(
      `INSERT INTO security_audit (id, actor_account_id, subject_account_id, event_type, detail)
       VALUES ($1, NULL, $2, $3, $4::jsonb)`,
      [
        randomUUID(),
        account.id,
        action === "grant" ? "master_recovery_granted" : "master_recovery_revoked",
        JSON.stringify({ channel: "container_recovery" }),
      ],
    );
    return { ok: true, value: { email: email.data, role: nextRole } };
  });
}
