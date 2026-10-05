import { NextRequest, NextResponse } from "next/server";
import {
  INTENSIVE_DEVICE_COOKIE,
  authenticateRequest,
  clearSessionCookies,
  deviceHash,
  requestIp,
  userRequest,
} from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });
  if (auth.profile.role !== "STUDENT") return NextResponse.json({ ok: true, admin: true });

  const body = (await request.json().catch(() => ({}))) as { deviceSecret?: string };
  const secret = String(body.deviceSecret ?? "");
  if (secret.length < 24 || secret.length > 256) {
    return NextResponse.json({ ok: false, message: "Invalid device identifier." }, { status: 400 });
  }

  const tokenHash = deviceHash(secret);
  try {
    const result = await userRequest<{ authorized: boolean; registered?: boolean; reason?: string }>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_register_or_verify_device",
      {
        method: "POST",
        body: JSON.stringify({
          p_token_hash: tokenHash,
          p_user_agent: request.headers.get("user-agent"),
          p_ip: requestIp(request),
        }),
      },
    );

    if (!result.authorized) {
      const response = NextResponse.json(
        {
          ok: false,
          code: result.reason ?? "DEVICE_NOT_AUTHORIZED",
          message: "This account is linked to another device. Contact NUMO support to reset it.",
        },
        { status: 403 },
      );
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true, registered: Boolean(result.registered) });
    response.cookies.set(INTENSIVE_DEVICE_COOKIE, tokenHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to verify this device." }, { status: 500 });
  }
}
