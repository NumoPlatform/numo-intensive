import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  intensiveTodayRiyadh,
  profileByUsername,
  serviceRequest,
  userRequest,
  writeIntensiveAudit,
} from "@/lib/intensive/server";

type CreatedUser = { id: string; email?: string | null };

async function deleteAuthUser(accessToken: string, id: string) {
  try {
    await userRequest<unknown>(accessToken, "/functions/v1/intensive-auth-admin", {
      method: "POST",
      body: JSON.stringify({ action: "deleteUser", userId: id }),
    });
  } catch {
    // Best-effort rollback. The admin can retry after the auth record is removed.
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    fullName?: string;
    username?: string;
    password?: string;
    courseIds?: string[];
    startDate?: string | null;
    expirationDate?: string | null;
  };

  const fullName = String(body.fullName ?? "").trim();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const courseIds = Array.isArray(body.courseIds)
    ? [...new Set(body.courseIds.map(String).filter(Boolean))]
    : [];
  const startDate = body.startDate ? String(body.startDate) : "";
  const expirationDate = body.expirationDate ? String(body.expirationDate) : "";

  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ ok: false, message: "Enter a valid student name." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
    return NextResponse.json(
      { ok: false, message: "The username must contain 3–40 English letters or numbers. Dots, underscores, and hyphens are allowed." },
      { status: 400 },
    );
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ ok: false, message: "The password must contain at least 8 characters." }, { status: 400 });
  }
  if (courseIds.length < 1) {
    return NextResponse.json({ ok: false, message: "Select at least one course." }, { status: 400 });
  }
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ ok: false, message: "Enter a valid start date." }, { status: 400 });
  }
  if (expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
    return NextResponse.json({ ok: false, message: "Enter a valid expiration date." }, { status: 400 });
  }
  if (startDate && expirationDate && expirationDate < startDate) {
    return NextResponse.json(
      { ok: false, message: "The expiration date cannot be earlier than the start date." },
      { status: 400 },
    );
  }
  if (await profileByUsername(username)) {
    return NextResponse.json({ ok: false, message: "This username is already in use." }, { status: 409 });
  }

  const courseQuery = new URLSearchParams({
    select: "id",
    id: "in.(" + courseIds.join(",") + ")",
    is_active: "eq.true",
  });
  const courses = await serviceRequest<Array<{ id: string }>>(
    "/rest/v1/intensive_courses?" + courseQuery.toString(),
  );
  if (courses.length !== courseIds.length) {
    return NextResponse.json({ ok: false, message: "One of the selected courses is invalid." }, { status: 400 });
  }

  const email = "student-" + randomUUID() + "@accounts.numo.academy";
  let createdUser: CreatedUser | null = null;

  try {
    const authResult = await userRequest<{ ok: boolean; user?: CreatedUser }>(
      auth.accessToken,
      "/functions/v1/intensive-auth-admin",
      {
        method: "POST",
        body: JSON.stringify({ action: "createUser", email, password }),
      },
    );
    if (!authResult.ok || !authResult.user?.id) throw new Error("AUTH_USER_CREATE_FAILED");
    createdUser = authResult.user;

    const profileRows = await serviceRequest<Array<{ id: string }>>("/rest/v1/intensive_profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: createdUser.id,
        full_name: fullName,
        username,
        role: "STUDENT",
        status: "ACTIVE",
        start_date: startDate || null,
        expiration_date: expirationDate || null,
        created_by: auth.profile.id,
      }),
    });

    if (!profileRows[0]?.id) throw new Error("PROFILE_CREATE_FAILED");

    await serviceRequest<unknown>("/rest/v1/intensive_enrollments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        courseIds.map((courseId) => ({
          student_id: createdUser!.id,
          course_id: courseId,
          start_date: startDate || intensiveTodayRiyadh(),
          expiration_date: expirationDate || null,
          is_active: true,
        })),
      ),
    });

    await writeIntensiveAudit(
      auth.profile.id,
      "CREATE_STUDENT",
      "intensive_profiles",
      createdUser.id,
      { username, course_ids: courseIds },
    );

    return NextResponse.json({
      ok: true,
      student: { id: createdUser.id, fullName, username, courseIds },
    });
  } catch {
    if (createdUser?.id) await deleteAuthUser(auth.accessToken, createdUser.id);
    return NextResponse.json(
      { ok: false, message: "Unable to create the student account. No partial account was saved." },
      { status: 500 },
    );
  }
}
