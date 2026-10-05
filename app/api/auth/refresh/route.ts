import { NextRequest, NextResponse } from "next/server";
import {
  INTENSIVE_REFRESH_COOKIE,
  clearSessionCookies,
  refreshIntensiveSession,
  writeSessionCookies,
} from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(INTENSIVE_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const response = NextResponse.json({ ok: false, message: "No session is available to renew." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const session = await refreshIntensiveSession(refreshToken);
  if (!session) {
    const response = NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  writeSessionCookies(response, session);
  return response;
}
