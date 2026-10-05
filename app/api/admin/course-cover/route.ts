import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, writeIntensiveAudit } from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { courseId?: string; coverUrl?: string };
  const courseId = String(body.courseId ?? "");
  const coverUrl = String(body.coverUrl ?? "").trim();
  if (!courseId) return NextResponse.json({ ok: false, message: "Select a course." }, { status: 400 });
  if (coverUrl && !coverUrl.startsWith("/") && !/^https:\/\//i.test(coverUrl)) {
    return NextResponse.json({ ok: false, message: "The cover URL must start with / or https://." }, { status: 400 });
  }

  await serviceRequest<unknown>("/rest/v1/intensive_courses?id=eq." + encodeURIComponent(courseId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ default_cover_url: coverUrl || null }),
  });
  await writeIntensiveAudit(
    auth.profile.id,
    "UPDATE_COURSE_COVER",
    "intensive_courses",
    courseId,
    { cover_url: coverUrl || null, source: "URL" },
  );
  return NextResponse.json({ ok: true });
}
