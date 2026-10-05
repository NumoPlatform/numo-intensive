import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  serviceRequest,
  userRequest,
  verifyStudentDevice,
} from "@/lib/intensive/server";

type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  attempts_allowed: number;
  total_marks: number;
  status: string;
};

type Course = {
  id: string;
  code: string;
  title: string;
};

type Attempt = {
  id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
};

type Result = {
  attempt_id: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  status: string | null;
  grading_status: string;
  is_published: boolean;
  published_at: string | null;
};

type SectionScore = {
  sectionId: string;
  title: string;
  score: number;
  totalMarks: number;
  percentage: number;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  }
  if (auth.profile.role !== "STUDENT") {
    return NextResponse.json({ ok: false, message: "Student access only." }, { status: 403 });
  }
  if (!(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  try {
    await userRequest<number>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_release_due_results",
      { method: "POST", body: "{}" },
    );
  } catch {
    // A maintenance release check should never block result history.
  }

  const examId = request.nextUrl.searchParams.get("examId")?.trim();
  if (!examId) {
    return NextResponse.json({ ok: false, message: "Select an exam." }, { status: 400 });
  }

  try {
    const exams = await userRequest<Exam[]>(
      auth.accessToken,
      "/rest/v1/intensive_exams?" +
        new URLSearchParams({
          select: "id,course_id,title,category,starts_at,ends_at,attempts_allowed,total_marks,status",
          id: "eq." + examId,
          limit: "1",
        }).toString(),
      { method: "GET" },
    );
    const exam = exams[0];
    if (!exam) {
      return NextResponse.json({ ok: false, message: "Exam not found." }, { status: 404 });
    }

    const [courses, attempts, results] = await Promise.all([
      serviceRequest<Course[]>(
        "/rest/v1/intensive_courses?" +
          new URLSearchParams({
            select: "id,code,title",
            id: "eq." + exam.course_id,
            limit: "1",
          }).toString(),
      ),
      serviceRequest<Attempt[]>(
        "/rest/v1/intensive_exam_attempts?" +
          new URLSearchParams({
            select: "id,attempt_number,status,started_at,submitted_at",
            exam_id: "eq." + examId,
            student_id: "eq." + auth.profile.id,
            order: "attempt_number.asc",
          }).toString(),
      ),
      serviceRequest<Result[]>(
        "/rest/v1/intensive_results?" +
          new URLSearchParams({
            select: "attempt_id,final_score,total_marks,percentage,status,grading_status,is_published,published_at",
            exam_id: "eq." + examId,
            student_id: "eq." + auth.profile.id,
            is_published: "eq.true",
            order: "created_at.asc",
          }).toString(),
      ),
    ]);

    const resultByAttempt = new Map(results.map((result) => [result.attempt_id, result]));

    const history = await Promise.all(
      attempts.map(async (attempt) => {
        const result = resultByAttempt.get(attempt.id) ?? null;
        let sectionBreakdown: SectionScore[] = [];

        if (result) {
          try {
            sectionBreakdown = await userRequest<SectionScore[]>(
              auth.accessToken,
              "/rest/v1/rpc/intensive_attempt_score_breakdown",
              {
                method: "POST",
                body: JSON.stringify({ p_attempt_id: attempt.id }),
              },
            );
          } catch {
            sectionBreakdown = [];
          }
        }

        return {
          ...attempt,
          result,
          sectionBreakdown,
        };
      }),
    );

    const best = results
      .filter((result) => result.percentage !== null)
      .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0] ?? null;

    return NextResponse.json({
      ok: true,
      course: courses[0] ?? null,
      exam,
      attemptsUsed: attempts.length,
      attemptsRemaining: Math.max(0, exam.attempts_allowed - attempts.length),
      bestResult: best,
      history,
      now: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to load result history." },
      { status: 500 },
    );
  }
}
