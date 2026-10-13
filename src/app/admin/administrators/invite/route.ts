import type { NextRequest } from "next/server";

import { adminOversightRedirect, adminOversightRequest, oversightFormValue, rejectOversightCrossOrigin } from "@/features/admin-oversight/server/adapter";

export async function POST(request: NextRequest) {
  const denied = rejectOversightCrossOrigin(request);
  if (denied) return denied;
  const form = await request.formData();
  const { identity, sessionToken } = await adminOversightRequest();
  const result = await identity.inviteAdmin(sessionToken, oversightFormValue(form, "email"));
  return adminOversightRedirect(request, `/admin/administrators?result=${result.ok ? "invited" : result.code === "conflict" ? "conflict" : "error"}`);
}