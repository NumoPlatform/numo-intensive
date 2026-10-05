import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requestIp, serviceRequest, signInWithUsername, writeSessionCookies } from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  let stage = "REQUEST";
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ ok: false, message: "Enter your username and password." }, { status: 400 });
    }

    const rateKey = createHash("sha256")
      .update((requestIp(request) ?? "unknown") + "|" + username.toLowerCase())
      .digest("hex");
    stage = "RATE_CHECK";
    const rate = await serviceRequest<{ allowed: boolean; retry_after?: number }>(
      "/rest/v1/rpc/intensive_login_rate_check",
      { method: "POST", body: JSON.stringify({ p_key_hash: rateKey }) },
    );
    if (!rate.allowed) {
      const minutes = Math.max(1, Math.ceil(Number(rate.retry_after ?? 60) / 60));
      return NextResponse.json(
        { ok: false, message: "Sign-in attempts are temporarily blocked. Try again in " + minutes + " minutes." },
        { status: 429 },
      );
    }

    stage = "AUTHENTICATION";
    const result = await signInWithUsername(username, password);
    if (!result) {
      await serviceRequest<unknown>(
        "/rest/v1/rpc/intensive_login_rate_failure",
        { method: "POST", body: JSON.stringify({ p_key_hash: rateKey }) },
      );
      return NextResponse.json(
        { ok: false, message: "The sign-in details are incorrect or the account is inactive." },
        { status: 401 },
      );
    }

    stage = "RATE_SUCCESS";
    await serviceRequest<unknown>(
      "/rest/v1/rpc/intensive_login_rate_success",
      { method: "POST", body: JSON.stringify({ p_key_hash: rateKey }) },
    );

    stage = "PROFILE_UPDATE";
    await serviceRequest<unknown>(
      "/rest/v1/intensive_profiles?id=eq." + encodeURIComponent(result.profile.id),
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_login_at: new Date().toISOString() }),
      },
    );

    const response = NextResponse.json({
      ok: true,
      role: result.profile.role,
      name: result.profile.full_name,
    });
    writeSessionCookies(response, result.session);
    return response;
  } catch (error) {
    const missingConfig = error instanceof Error && error.message === "INTENSIVE_SUPABASE_CONFIG_MISSING";
    const code = missingConfig ? "SIGN_IN_CONFIG_MISSING" : "SIGN_IN_" + stage + "_FAILED";
    console.error("[intensive-login]", { code });
    return NextResponse.json({ ok: false, code, message: "Unable to sign in right now. Reference: " + code }, { status: 500 });
  }
}
