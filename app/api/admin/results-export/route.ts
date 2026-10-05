import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, writeIntensiveAudit } from "@/lib/intensive/server";

type Attempt = {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
};

type Result = {
  attempt_id: string;
  exam_id: string;
  student_id: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  status: string | null;
  grading_status: string;
  is_published: boolean;
  published_at: string | null;
};

type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
};

type Course = {
  id: string;
  code: string;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
};

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  }
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const examId = request.nextUrl.searchParams.get("examId")?.trim() || null;

  try {
    const examParams = new URLSearchParams({
      select: "id,course_id,title,category",
      order: "title.asc",
    });
    if (examId) examParams.set("id", "eq." + examId);

    const exams = await serviceRequest<Exam[]>(
      "/rest/v1/intensive_exams?" + examParams.toString(),
    );

    if (examId && exams.length !== 1) {
      return NextResponse.json({ ok: false, message: "Exam not found." }, { status: 404 });
    }

    const examIds = exams.map((exam) => exam.id);
    if (!examIds.length) {
      const empty = "Course,Exam,Category,Student,Username,Attempt,Attempt Status,Started,Submitted,Score,Total Marks,Percentage,Result Status,Grading Status,Published,Best Attempt\n";
      return new NextResponse(empty, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="numo-intensive-results.csv"',
          "Cache-Control": "private, no-store",
        },
      });
    }

    const attempts = await serviceRequest<Attempt[]>(
      "/rest/v1/intensive_exam_attempts?" +
        new URLSearchParams({
          select: "id,exam_id,student_id,attempt_number,status,started_at,submitted_at",
          exam_id: "in.(" + examIds.join(",") + ")",
          order: "started_at.asc",
        }).toString(),
    );

    const [results, courses, profiles] = await Promise.all([
      serviceRequest<Result[]>(
        "/rest/v1/intensive_results?" +
          new URLSearchParams({
            select: "attempt_id,exam_id,student_id,final_score,total_marks,percentage,status,grading_status,is_published,published_at",
            exam_id: "in.(" + examIds.join(",") + ")",
            order: "created_at.asc",
          }).toString(),
      ),
      serviceRequest<Course[]>(
        "/rest/v1/intensive_courses?" +
          new URLSearchParams({
            select: "id,code",
            id: "in.(" + [...new Set(exams.map((exam) => exam.course_id))].join(",") + ")",
          }).toString(),
      ),
      serviceRequest<Profile[]>(
        "/rest/v1/intensive_profiles?" +
          new URLSearchParams({
            select: "id,full_name,username",
            role: "eq.STUDENT",
          }).toString(),
      ),
    ]);

    const examMap = new Map(exams.map((exam) => [exam.id, exam]));
    const courseMap = new Map(courses.map((course) => [course.id, course]));
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const resultMap = new Map(results.map((result) => [result.attempt_id, result]));

    const bestMap = new Map<string, string>();
    for (const result of results) {
      if (result.percentage === null) continue;
      const key = result.student_id + "::" + result.exam_id;
      const currentId = bestMap.get(key);
      const current = currentId ? resultMap.get(currentId) : null;
      if (!current || Number(result.percentage) > Number(current.percentage ?? -1)) {
        bestMap.set(key, result.attempt_id);
      }
    }

    const headers = [
      "Course",
      "Exam",
      "Category",
      "Student",
      "Username",
      "Attempt",
      "Attempt Status",
      "Started",
      "Submitted",
      "Score",
      "Total Marks",
      "Percentage",
      "Result Status",
      "Grading Status",
      "Published",
      "Best Attempt",
    ];

    const rows = attempts.map((attempt) => {
      const exam = examMap.get(attempt.exam_id);
      const course = exam ? courseMap.get(exam.course_id) : null;
      const student = profileMap.get(attempt.student_id);
      const result = resultMap.get(attempt.id);
      const best = bestMap.get(attempt.student_id + "::" + attempt.exam_id) === attempt.id;

      return [
        course?.code ?? "",
        exam?.title ?? "",
        exam?.category ?? "",
        student?.full_name ?? "",
        student?.username ?? "",
        attempt.attempt_number,
        attempt.status,
        attempt.started_at,
        attempt.submitted_at ?? "",
        result?.final_score ?? "",
        result?.total_marks ?? "",
        result?.percentage ?? "",
        result?.status ?? "",
        result?.grading_status ?? "",
        result?.is_published ? "Yes" : "No",
        best ? "Yes" : "No",
      ];
    });

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n") +
      "\r\n";

    const filename = examId
      ? "numo-intensive-" + (exams[0]?.title ?? "exam").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-results.csv"
      : "numo-intensive-results.csv";

    await writeIntensiveAudit(
      auth.profile.id,
      "EXPORT_RESULTS",
      examId ? "intensive_exams" : "intensive_results",
      examId,
      { rows: rows.length, scope: examId ? "EXAM" : "ALL" },
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to export results." },
      { status: 500 },
    );
  }
}
