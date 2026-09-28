import pg from "pg";

import { readMigrationFiles } from "./migration-files.mjs";
import { assertDockerRuntime, assertSafeDatabaseTarget } from "./safety.mjs";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL ?? "";
const appEnvironment = process.env.APP_ENV ?? "";

assertSafeDatabaseTarget({ appEnvironment, databaseUrl });
assertDockerRuntime();

const migrations = await readMigrationFiles();
const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL CHECK (char_length(checksum) = 64),
      applied_at timestamptz NOT NULL DEFAULT statement_timestamp()
    )
  `);

  const appliedResult = await client.query("SELECT name, checksum FROM schema_migrations ORDER BY name");
  const applied = new Map(appliedResult.rows.map((row) => [row.name, row.checksum]));

  for (const migration of migrations) {
    const existingChecksum = applied.get(migration.name);

    if (existingChecksum && existingChecksum !== migration.checksum) {
      throw new Error(`Applied migration '${migration.name}' has a different checksum.`);
    }

    if (existingChecksum) {
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
        migration.name,
        migration.checksum,
      ]);
      await client.query("COMMIT");
      console.log(`Applied ${migration.name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log(`Migration history verified (${migrations.length} migration(s)).`);
} finally {
  await client.end();
}