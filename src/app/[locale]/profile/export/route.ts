import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { redirectTo } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { learnerUtilitiesRequest } from "@/features/learner-utilities/server/adapter";

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/login?result=denied");
  const { sessionToken, oversight } = await learnerUtilitiesRequest();
  const result = await oversight.exportOwnData(sessionToken);
  if (!result.ok) return redirectTo(request, `/${locale}/login?result=denied`);
  return new NextResponse(JSON.stringify(result.value, null, 2), {
    headers: {
      "Content-Disposition": 'attachment; filename="freemeditation-my-data.json"',
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}