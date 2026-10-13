import type { NextRequest } from "next/server";

import { adminOversightRedirect, adminOversightRequest, isOversightIdentifier, oversightFormValue, rejectOversightCrossOrigin } from "@/features/admin-oversight/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params;
  const denied = rejectOversightCrossOrigin(request);
  if (denied) return denied;
  const form = await request.formData();
  const previewId = oversightFormValue(form, "previewId");
  const fingerprint = oversightFormValue(form, "fingerprint");
  const reason = oversightFormValue(form, "reason");
  if (!isOversightIdentifier(learnerId) || !isOversightIdentifier(previewId)) {
    return adminOversightRedirect(request, `/admin/learners/${learnerId}/reset?result=error`);
  }
  const { resets, sessionToken } = await adminOversightRequest();
  const result = await resets.confirm(sessionToken, { previewId, fingerprint, reason });
  return adminOversightRedirect(request, `/admin/learners/${learnerId}/reset?result=${result.ok ? "reset" : result.code === "conflict" ? "conflict" : "error"}`);
}