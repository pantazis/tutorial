import type { NextRequest } from "next/server";

import { adminOversightRedirect, adminOversightRequest, isOversightIdentifier, oversightFormValue, rejectOversightCrossOrigin } from "@/features/admin-oversight/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const denied = rejectOversightCrossOrigin(request);
  if (denied) return denied;
  const form = await request.formData();
  const action = oversightFormValue(form, "action");
  if (!isOversightIdentifier(accountId) || (action !== "grant" && action !== "revoke")) {
    return adminOversightRedirect(request, "/admin/administrators?result=error");
  }
  const { identity, sessionToken } = await adminOversightRequest();
  const result = await identity.changeAdminRole(sessionToken, accountId, action);
  return adminOversightRedirect(request, `/admin/administrators?result=${result.ok ? action === "grant" ? "granted" : "revoked" : result.code === "conflict" ? "conflict" : "error"}`);
}