import type { AuthenticatedContext } from "./types";

export function canAccessOwnAccount(context: AuthenticatedContext, accountId: string): boolean {
  return context.accountId === accountId;
}

export function canAccessAdministration(context: AuthenticatedContext): boolean {
  return context.role === "admin" || context.role === "master_admin";
}

export function canManageAdministrators(context: AuthenticatedContext): boolean {
  return context.role === "master_admin";
}
