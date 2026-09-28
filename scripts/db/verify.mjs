import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

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

  const checkDirectory = path.join(process.cwd(), "db", "checks");
  const checks = (await readdir(checkDirectory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/u.test(name))
    .sort((left, right) => left.localeCompare(right));

  for (const check of checks) {
    const result = await client.query(await readFile(path.join(checkDirectory, check), "utf8"));
    if (result.rows[0]?.ok !== true) {
      throw new Error(`Database check '${check}' failed.`);
    }
  }

  console.log("Migration smoke test passed.");
} finally {
  await client.end();
}