export interface DatabaseTargetInput {
  appEnvironment: string;
  databaseUrl: string;
}

export interface SafeDatabaseTarget {
  databaseName: string;
  hostname: string;
}

export function assertSafeDatabaseTarget(input: DatabaseTargetInput): SafeDatabaseTarget;
export function assertDockerRuntime(): void;