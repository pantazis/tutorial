import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATION_NAME = /^\d{4}_[a-z0-9_]+\.sql$/u;

export async function readMigrationFiles(rootDirectory = process.cwd()) {
  const migrationDirectory = path.join(rootDirectory, "db", "migrations");
  const entries = (await readdir(migrationDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && MIGRATION_NAME.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (new Set(entries).size !== entries.length) {
    throw new Error("Duplicate migration names are not allowed.");
  }

  return Promise.all(
    entries.map(async (name) => {
      const sql = await readFile(path.join(migrationDirectory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { checksum, name, sql };
    }),
  );
}