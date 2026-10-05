import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, intensiveTodayRiyadh, serviceRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

type Enrollment = { course_id: string; expiration_date: string | null };
type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  default_cover_url: string | null;
  cover_path: string | null;
};
type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  attempts_allowed: number;
  total_marks: number;
  status: string;
};
type Section = {
  id: string;
  exam_id: string;
  title: string;
  position: number;
  time_limit_minutes: number;
  question_count: number | null;
  marks: number;
};

type Attempt = {
  id: string;
  exam_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  section_progress: Record<string, {
    attempt_count?: number;
    best_percentage?: number;
    completed_at?: string | null;
  }>;
};
type Result = {
  attempt_id: string;
  exam_id: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  status: string | null;
  grading_status: string;
  is_published: boolean;
  published_at: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json(
      { ok: false, message: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  if (auth.profile.role === "STUDENT") {
    const trusted = await verifyStudentDevice(request, auth.accessToken);
    if (!trusted) {
      return NextResponse.json(
        { ok: false, code: "DEVICE_NOT_AUTHORIZED", message: "This device is not authorized for your account." },
        { status: 403 },
      );
    }
  }

  if (auth.profile.role === "STUDENT") {
    try {
      await userRequest<number>(
        auth.accessToken,
        "/rest/v1/rpc/intensive_release_due_results",
        { method: "POST", body: "{}" },
      );
    } catch {
      // Result release maintenance should never block the student dashboard.
    }
  }

  const today = intensiveTodayRiyadh();
  const enrollQuery = new URLSearchParams({
    select: "course_id,expiration_date",
    student_id: "eq." + auth.profile.id,
    is_active: "eq.true",
    start_date: "lte." + today,
    or: "(expiration_date.is.null,expiration_date.gte." + today + ")",
  });
  const enrollments =
    auth.profile.role === "STUDENT"
      ? await serviceRequest<Enrollment[]>("/rest/v1/intensive_enrollments?" + enrollQuery.toString())
      : [];

  const courseIds = enrollments.map((item) => item.course_id);
  let courses: Course[] = [];
  let exams: Exam[] = [];
  let sections: Section[] = [];
  let attempts: Attempt[] = [];
  let results: Result[] = [];

  if (auth.profile.role === "STUDENT" && courseIds.length) {
    const courseQuery = new URLSearchParams({
      select: "id,code,title,description,default_cover_url,cover_path",
      id: "in.(" + courseIds.join(",") + ")",
      is_active: "eq.true",
      order: "code.asc",
    });
    courses = await serviceRequest<Course[]>("/rest/v1/intensive_courses?" + courseQuery.toString());

    const examQuery = new URLSearchParams({
      select: "id,course_id,title,category,starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,status",
      course_id: "in.(" + courseIds.join(",") + ")",
      status: "in.(SCHEDULED,LIVE,CLOSED,PUBLISHED)",
      order: "starts_at.asc",
    });
    exams = await serviceRequest<Exam[]>("/rest/v1/intensive_exams?" + examQuery.toString());

    const examIds = exams.map((item) => item.id);
    if (examIds.length) {
      const sectionQuery = new URLSearchParams({
        select: "id,exam_id,title,position,time_limit_minutes,question_count,marks",
        exam_id: "in.(" + examIds.join(",") + ")",
        is_enabled: "eq.true",
        order: "position.asc",
      });
      const attemptQuery = new URLSearchParams({
        select: "id,exam_id,attempt_number,status,started_at,expires_at,submitted_at,section_progress",
        student_id: "eq." + auth.profile.id,
        exam_id: "in.(" + examIds.join(",") + ")",
        order: "started_at.desc",
      });
      const resultQuery = new URLSearchParams({
        select: "attempt_id,exam_id,final_score,total_marks,percentage,status,grading_status,is_published,published_at",
        student_id: "eq." + auth.profile.id,
        exam_id: "in.(" + examIds.join(",") + ")",
        is_published: "eq.true",
        order: "created_at.desc",
      });

      [sections, attempts, results] = await Promise.all([
        serviceRequest<Section[]>("/rest/v1/intensive_exam_sections?" + sectionQuery.toString()),
        serviceRequest<Attempt[]>("/rest/v1/intensive_exam_attempts?" + attemptQuery.toString()),
        serviceRequest<Result[]>("/rest/v1/intensive_results?" + resultQuery.toString()),
      ]);
    }
  }

  const settingsRows = await serviceRequest<Array<{
    support_phone: string | null;
    support_whatsapp: string | null;
    support_website: string | null;
    support_email: string | null;
    timezone: string;
  }>>(
    "/rest/v1/intensive_settings?" + new URLSearchParams({
      select: "support_phone,support_whatsapp,support_website,support_email,timezone",
      id: "eq.true",
      limit: "1",
    }).toString(),
  );

  return NextResponse.json({
    ok: true,
    profile: auth.profile,
    courses,
    exams,
    sections,
    attempts,
    results,
    settings: settingsRows[0] ?? null,
    now: new Date().toISOString(),
  });
}
