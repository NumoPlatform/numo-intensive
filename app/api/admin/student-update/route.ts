import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, userRequest, writeIntensiveAudit } from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    studentId?: string;
    status?: "ACTIVE" | "SUSPENDED" | "EXPIRED";
    expirationDate?: string | null;
    courseIds?: string[];
    password?: string;
  };

  const studentId = String(body.studentId ?? "");
  if (!studentId) return NextResponse.json({ ok: false, message: "Select a student." }, { status: 400 });

  if (body.status && !["ACTIVE", "SUSPENDED", "EXPIRED"].includes(body.status)) {
    return NextResponse.json({ ok: false, message: "Select a valid account status." }, { status: 400 });
  }

  if (
    body.expirationDate !== undefined &&
    body.expirationDate !== null &&
    body.expirationDate !== "" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(String(body.expirationDate))
  ) {
    return NextResponse.json({ ok: false, message: "Enter a valid expiration date." }, { status: 400 });
  }

  if (body.password) {
    const password = String(body.password);
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ ok: false, message: "The password must contain at least 8 characters." }, { status: 400 });
    }
  }

  const studentRows = await serviceRequest<Array<{ id: string; role: string }>>(
    "/rest/v1/intensive_profiles?" + new URLSearchParams({
      select: "id,role",
      id: "eq." + studentId,
      limit: "1",
    }).toString(),
  );
  if (!studentRows[0] || studentRows[0].role !== "STUDENT") {
    return NextResponse.json({ ok: false, message: "Student account not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.expirationDate !== undefined) patch.expiration_date = body.expirationDate || null;

  if (Object.keys(patch).length) {
    await serviceRequest<unknown>("/rest/v1/intensive_profiles?id=eq." + encodeURIComponent(studentId), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  }

  if (Array.isArray(body.courseIds)) {
    const courseIds = [...new Set(body.courseIds.map(String).filter(Boolean))];
    if (courseIds.length) {
      const courseQuery = new URLSearchParams({
        select: "id",
        id: "in.(" + courseIds.join(",") + ")",
        is_active: "eq.true",
      });
      const valid = await serviceRequest<Array<{ id: string }>>(
        "/rest/v1/intensive_courses?" + courseQuery.toString(),
      );
      if (valid.length !== courseIds.length) {
        return NextResponse.json({ ok: false, message: "One of the selected courses is invalid." }, { status: 400 });
      }
    }

    await serviceRequest<unknown>("/rest/v1/intensive_enrollments?student_id=eq." + encodeURIComponent(studentId), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_active: false }),
    });

    for (const courseId of courseIds) {
      const existing = await serviceRequest<Array<{ id: string }>>(
        "/rest/v1/intensive_enrollments?" + new URLSearchParams({
          select: "id",
          student_id: "eq." + studentId,
          course_id: "eq." + courseId,
          limit: "1",
        }).toString(),
      );

      if (existing[0]) {
        await serviceRequest<unknown>("/rest/v1/intensive_enrollments?id=eq." + existing[0].id, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ is_active: true, expiration_date: body.expirationDate || null }),
        });
      } else {
        await serviceRequest<unknown>("/rest/v1/intensive_enrollments", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            student_id: studentId,
            course_id: courseId,
            start_date: new Date().toISOString().slice(0, 10),
            expiration_date: body.expirationDate || null,
            is_active: true,
          }),
        });
      }
    }
  }

  if (body.password) {
    await userRequest<unknown>(
      auth.accessToken,
      "/functions/v1/intensive-auth-admin",
      {
        method: "POST",
        body: JSON.stringify({
          action: "updatePassword",
          userId: studentId,
          password: String(body.password),
        }),
      },
    );
  }

  await writeIntensiveAudit(
    auth.profile.id,
    "UPDATE_STUDENT",
    "intensive_profiles",
    studentId,
    {
      status: body.status ?? null,
      expiration_date: body.expirationDate ?? null,
      course_ids: Array.isArray(body.courseIds) ? body.courseIds : null,
      password_changed: Boolean(body.password),
    },
  );

  return NextResponse.json({ ok: true });
}
