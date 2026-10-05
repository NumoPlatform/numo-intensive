import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { NextRequest, NextResponse } from "next/server";

export const INTENSIVE_ACCESS_COOKIE = "numo_intensive_access";
export const INTENSIVE_REFRESH_COOKIE = "numo_intensive_refresh";
export const INTENSIVE_DEVICE_COOKIE = "numo_intensive_device";

export type IntensiveProfile = {
  id: string;
  full_name: string;
  username: string;
  role: "ADMIN" | "STUDENT";
  status: string;
  start_date: string | null;
  expiration_date: string | null;
};

type AuthUser = { id: string; email?: string | null };
type PasswordSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
};

type LoginIdentity = { id: string; email: string } | null;

const requestAccessToken = new AsyncLocalStorage<string>();

function jwtRole(key: string) {
  if (!key.includes(".")) return null;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function uniqueKeys(values: Array<string | undefined>, kind: "publishable" | "server") {
  return [...new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        if (kind === "publishable") {
          return value.startsWith("sb_publishable_") || jwtRole(value) === "anon";
        }
        return value.startsWith("sb_secret_") || jwtRole(value) === "service_role";
      }),
  )];
}

function publicConfig() {
  const url = process.env.NUMO_INTENSIVE_SUPABASE_URL ?? "";
  const publishableKeys = uniqueKeys([
    process.env.NUMO_INTENSIVE_SUPABASE_PUBLISHABLE_KEY,
  ], "publishable");

  if (!url || !publishableKeys.length) {
    throw new Error("INTENSIVE_SUPABASE_PUBLIC_CONFIG_MISSING");
  }

  return {
    url: url.trim().replace(/\/$/, ""),
    publishableKeys,
  };
}

function serverKeys() {
  return uniqueKeys([
    process.env.NUMO_INTENSIVE_SUPABASE_SERVER_KEY,
  ], "server");
}

async function invalidApiKeyResponse(response: Response) {
  if (response.status !== 401 && response.status !== 403) return false;
  const body = await response.clone().text().catch(() => "");
  return /invalid api key|api key.*invalid|apikey.*invalid/i.test(body);
}

async function fetchWithPublishableKey(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const { url, publishableKeys } = publicConfig();
  let lastResponse: Response | null = null;

  for (const publishableKey of publishableKeys) {
    const headers = new Headers(init.headers);
    headers.set("apikey", publishableKey);
    if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
    headers.set("Content-Type", "application/json");

    const response = await fetch(url + path, { ...init, headers, cache: "no-store" });
    lastResponse = response;
    if (!(await invalidApiKeyResponse(response))) return response;
  }

  if (!lastResponse) throw new Error("INTENSIVE_SUPABASE_PUBLIC_CONFIG_MISSING");
  return lastResponse;
}

async function fetchWithServerKey(path: string, init: RequestInit = {}) {
  const { url } = publicConfig();
  const keys = serverKeys();
  let lastResponse: Response | null = null;

  for (const serverKey of keys) {
    const headers = new Headers(init.headers);
    headers.set("apikey", serverKey);
    if (serverKey.startsWith("sb_secret_")) {
      headers.delete("Authorization");
    } else {
      headers.set("Authorization", "Bearer " + serverKey);
    }
    headers.set("Content-Type", "application/json");

    const response = await fetch(url + path, { ...init, headers, cache: "no-store" });
    lastResponse = response;
    if (!(await invalidApiKeyResponse(response))) return response;
  }

  const accessToken = requestAccessToken.getStore();
  if (accessToken) {
    return fetchWithPublishableKey(path, init, accessToken);
  }

  if (lastResponse) return lastResponse;
  throw new Error("INTENSIVE_SUPABASE_SERVER_CONFIG_MISSING");
}

async function json<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(text || "SUPABASE_" + response.status);
  return (text ? JSON.parse(text) : null) as T;
}

export async function serviceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return json<T>(await fetchWithServerKey(path, init));
}

export async function serviceRawRequest(path: string, init: RequestInit = {}) {
  return fetchWithServerKey(path, init);
}

export function intensiveStoragePublicUrl(bucket: string, objectPath: string) {
  const { url } = publicConfig();
  return url + "/storage/v1/object/public/" + bucket + "/" + objectPath;
}

export async function writeIntensiveAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
) {
  await serviceRequest<unknown>("/rest/v1/intensive_audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    }),
  });
}

export async function publicRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return json<T>(await fetchWithPublishableKey(path, init));
}

export async function userRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return json<T>(await fetchWithPublishableKey(path, init, accessToken));
}

async function loginIdentity(username: string) {
  const response = await fetchWithPublishableKey("/rest/v1/rpc/intensive_login_identity", {
    method: "POST",
    body: JSON.stringify({ p_username: username.trim() }),
  });
  return json<LoginIdentity>(response);
}

export async function profileByUsername(username: string): Promise<IntensiveProfile | null> {
  const q = new URLSearchParams({
    select: "id,full_name,username,role,status,start_date,expiration_date",
    username: "eq." + username.trim(),
    limit: "1",
  });
  const rows = await serviceRequest<IntensiveProfile[]>("/rest/v1/intensive_profiles?" + q.toString());
  return rows[0] ?? null;
}

export async function profileById(id: string, accessToken?: string): Promise<IntensiveProfile | null> {
  const q = new URLSearchParams({
    select: "id,full_name,username,role,status,start_date,expiration_date",
    id: "eq." + id,
    limit: "1",
  });
  const path = "/rest/v1/intensive_profiles?" + q.toString();
  const rows = accessToken
    ? await userRequest<IntensiveProfile[]>(accessToken, path)
    : await serviceRequest<IntensiveProfile[]>(path);
  return rows[0] ?? null;
}

export function intensiveTodayRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function intensiveProfileWindowActive(profile: IntensiveProfile) {
  const today = intensiveTodayRiyadh();
  if (profile.start_date && profile.start_date > today) return false;
  if (profile.expiration_date && profile.expiration_date < today) return false;
  return true;
}

export async function refreshIntensiveSession(refreshToken: string) {
  const response = await fetchWithPublishableKey("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return json<PasswordSession>(response);
}

export async function signInWithUsername(username: string, password: string) {
  const identity = await loginIdentity(username);
  if (!identity?.email || !identity.id) return null;

  const response = await fetchWithPublishableKey("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: identity.email, password }),
  });
  if (!response.ok) return null;

  const session = await json<PasswordSession>(response);
  if (session.user.id !== identity.id) return null;

  const profile = await profileById(session.user.id, session.access_token);
  if (!profile || profile.status !== "ACTIVE" || !intensiveProfileWindowActive(profile)) return null;

  try {
    await userRequest<unknown>(
      session.access_token,
      "/rest/v1/intensive_profiles?id=eq." + encodeURIComponent(profile.id),
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_login_at: new Date().toISOString() }),
      },
    );
  } catch {
    // Login must not fail just because the last-login timestamp could not be updated.
  }

  return { session, profile };
}

export function writeSessionCookies(response: NextResponse, session: PasswordSession) {
  const secure = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  response.cookies.set(INTENSIVE_ACCESS_COOKIE, session.access_token, {
    ...common,
    maxAge: Math.max(60, session.expires_in - 30),
  });
  response.cookies.set(INTENSIVE_REFRESH_COOKIE, session.refresh_token, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [INTENSIVE_ACCESS_COOKIE, INTENSIVE_REFRESH_COOKIE, INTENSIVE_DEVICE_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
}

export async function authenticateRequest(request: NextRequest) {
  const accessToken = request.cookies.get(INTENSIVE_ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  try {
    const user = await userRequest<AuthUser>(accessToken, "/auth/v1/user", { method: "GET" });
    const profile = await profileById(user.id, accessToken);
    if (!profile || profile.status !== "ACTIVE" || !intensiveProfileWindowActive(profile)) return null;
    requestAccessToken.enterWith(accessToken);
    return { accessToken, user, profile };
  } catch {
    return null;
  }
}

export function deviceHash(deviceSecret: string) {
  return createHash("sha256").update(deviceSecret).digest("hex");
}

export async function verifyStudentDevice(request: NextRequest, accessToken: string) {
  const tokenHash = request.cookies.get(INTENSIVE_DEVICE_COOKIE)?.value;
  if (!tokenHash) return false;
  try {
    return await userRequest<boolean>(
      accessToken,
      "/rest/v1/rpc/intensive_verify_device",
      { method: "POST", body: JSON.stringify({ p_token_hash: tokenHash }) },
    );
  } catch {
    return false;
  }
}

export function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
