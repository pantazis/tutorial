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
  const history = await client.query(
    "SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name",
  );

  if (history.rows.length !== migrations.length) {
    throw new Error(
      `Expected ${migrations.length} applied migration(s), found ${history.rows.length}.`,
    );
  }

  migrations.forEach((migration, index) => {
    const applied = history.rows[index];
    if (applied.name !== migration.name || applied.checksum !== migration.checksum) {
      throw new Error(`Migration history mismatch at '${migration.name}'.`);
    }
  });

  for (const check of ["db/checks/0001_migration_history.sql"]) {
    const result = await client.query(await (await import("node:fs/promises")).readFile(check, "utf8"));
    if (result.rows[0]?.ok !== true) {
      throw new Error(`Database check '${check}' failed.`);
    }
  }

  console.log("Migration smoke test passed.");
} finally {
  await client.end();
}