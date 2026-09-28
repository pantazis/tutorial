import pg from "pg";

import { assertDockerRuntime, assertSafeDatabaseTarget } from "../db/safety.mjs";

const { Pool } = pg;
const action = process.env.MASTER_RECOVERY_ACTION;
const email = process.env.MASTER_RECOVERY_EMAIL;
const databaseUrl = process.env.DATABASE_URL ?? "";
const appEnvironment = process.env.APP_ENV ?? "";

assertSafeDatabaseTarget({ appEnvironment, databaseUrl });
assertDockerRuntime();

if ((action !== "grant" && action !== "revoke") || !email) {
  throw new Error("MASTER_RECOVERY_ACTION=grant|revoke and MASTER_RECOVERY_EMAIL are required.");
}

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(73003)");
  const accountResult = await client.query(
    "SELECT id, role, status FROM accounts WHERE email = lower($1) FOR UPDATE",
    [email],
  );
  const account = accountResult.rows[0];
  if (!account || account.status !== "active") throw new Error("Active account was not found.");

  if (action === "revoke" && account.role === "master_admin") {
    const masters = await client.query(
      "SELECT count(*)::int AS count FROM accounts WHERE role = 'master_admin' AND status = 'active'",
    );
    if ((masters.rows[0]?.count ?? 0) <= 1) throw new Error("At least one active master administrator is required.");
  }

  const nextRole = action === "grant" ? "master_admin" : "user";
  await client.query("UPDATE accounts SET role = $1, updated_at = statement_timestamp() WHERE id = $2", [
    nextRole,
    account.id,
  ]);
  await client.query(
    `INSERT INTO security_audit (id, actor_account_id, subject_account_id, event_type, detail)
     VALUES (gen_random_uuid(), NULL, $1, $2, '{"channel":"container_recovery"}'::jsonb)`,
    [account.id, action === "grant" ? "master_recovery_granted" : "master_recovery_revoked"],
  );
  await client.query("COMMIT");
  console.log(`Master recovery ${action} completed for ${email.toLowerCase()}.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
