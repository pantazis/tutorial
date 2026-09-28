import { NextResponse } from "next/server";

import { loadRequestContext } from "@/server/auth/http";

export async function GET() {
  const result = await loadRequestContext();

  if (!result.ok) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  return NextResponse.json({
    accountId: result.value.accountId,
    language: result.value.language,
    role: result.value.role,
  });
}
