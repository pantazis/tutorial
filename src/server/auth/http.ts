import "server-only";

import { cookies } from "next/headers";

import { getPool } from "@/server/db/pool";

import { SESSION_COOKIE_NAME } from "./cookie";
import { IdentityService } from "./service";
import type { AuthenticatedContext, ServiceResult } from "./types";

export async function loadRequestContext(): Promise<ServiceResult<AuthenticatedContext>> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
  return new IdentityService(getPool()).loadProtectedContext(token);
}
