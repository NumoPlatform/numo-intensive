import { NextRequest, NextResponse } from "next/server";
import {
  INTENSIVE_ACCESS_COOKIE,
  clearSessionCookies,
  userRequest,
} from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(INTENSIVE_ACCESS_COOKIE)?.value;

  if (accessToken) {
    try {
      await userRequest<unknown>(
        accessToken,
        "/auth/v1/logout",
        { method: "POST" },
      );
    } catch {
      // Local cookie cleanup must still succeed if the upstream session is
      // already expired or Supabase is temporarily unavailable.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
