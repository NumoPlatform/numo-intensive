import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

const ALLOWED_CATEGORIES = new Set(["QUIZ 1", "QUIZ 2", "MIDTERM", "FINAL", "MOCK EXAM", "PRACTICE EXAM", "CUSTOM"]);

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    courseId?: string;
    title?: string;
    category?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
    durationMinutes?: number;
    attemptsAllowed?: number;
    resultRelease?: "IMMEDIATE" | "AFTER_END" | "MANUAL";
    sectionDurationMinutes?: number;
    sectionDurations?: Record<string, number>;
    skills?: string[];
  };

  const category = String(body.category ?? "");
  const skills = Array.isArray(body.skills) ? body.skills.map((item) => String(item).trim()) : [];
  if (!ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ ok: false, message: "Select a valid exam category." }, { status: 400 });
  }
  if (skills.length !== 3 || new Set(skills.map((item) => item.toLowerCase())).size !== 3) {
    return NextResponse.json({ ok: false, message: "اختر الأقسام الثلاثة Grammar وVocabulary وReading بدون تكرار." }, { status: 400 });
  }
  const normalizedSkills = skills.map((item) => item.toLowerCase());
  if (!["grammar", "vocabulary", "reading"].every((item) => normalizedSkills.includes(item))) {
    return NextResponse.json({ ok: false, message: "الأقسام المطلوبة هي Grammar وVocabulary وReading فقط." }, { status: 400 });
  }

  const fallbackSectionMinutes = Number(body.sectionDurationMinutes ?? 30);
  const sectionDurations = Object.fromEntries(
    skills.map((skill) => [
      skill,
      Number(body.sectionDurations?.[skill] ?? fallbackSectionMinutes),
    ]),
  );
  if (Object.values(sectionDurations).some((value) => !Number.isInteger(value) || value < 1 || value > 240)) {
    return NextResponse.json({ ok: false, message: "مدة كل قسم يجب أن تكون بين 1 و240 دقيقة." }, { status: 400 });
  }

  try {
    const result = await userRequest<{ exam_id: string; sections: unknown[] }>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_admin_create_exam_with_section_times",
      {
        method: "POST",
        body: JSON.stringify({
          p_course_id: body.courseId,
          p_title: String(body.title ?? "").trim(),
          p_category: category,
          p_description: String(body.description ?? "").trim() || null,
          p_starts_at: body.startsAt,
          p_ends_at: body.endsAt,
          p_duration_minutes: Number(body.durationMinutes ?? 0),
          p_skills: skills,
          p_attempts_allowed: 0, // Platform-wide unlimited attempts policy
          p_result_release: body.resultRelease ?? "MANUAL",
          p_section_times: sectionDurations,
        }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        ok: false,
        message:
          message.includes("INVALID_SECTIONS") || message.includes("SECTIONS_MUST_BE_UNIQUE")
            ? "اختر الأقسام الثلاثة Grammar وVocabulary وReading بدون تكرار."
            : "تعذر إنشاء الاختبار. تحقق من المواعيد والمدة وبقية التفاصيل.",
      },
      { status: 400 },
    );
  }
}
