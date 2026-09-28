const SAFE_ENVIRONMENTS = new Set(["development", "test"]);
const SAFE_DATABASE_NAMES = /(?:_dev|_test|_restore_test)$/u;
const SAFE_HOSTS = new Set(["db", "restore-db", "localhost", "127.0.0.1", "::1"]);

export function assertSafeDatabaseTarget({ appEnvironment, databaseUrl }) {
  if (!SAFE_ENVIRONMENTS.has(appEnvironment)) {
    throw new Error(`Unsafe APP_ENV '${appEnvironment}'. Expected development or test.`);
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  if (!SAFE_HOSTS.has(parsed.hostname)) {
    throw new Error(`Unsafe database host '${parsed.hostname}'.`);
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!SAFE_DATABASE_NAMES.test(databaseName)) {
    throw new Error(`Unsafe database name '${databaseName}'.`);
  }

  return { databaseName, hostname: parsed.hostname };
}

export function assertDockerRuntime() {
  if (!process.env.DATABASE_URL?.includes("@db:") && !process.env.DATABASE_URL?.includes("@restore-db:")) {
    throw new Error("Database operations must run against an internal Docker Compose hostname.");
  }
}