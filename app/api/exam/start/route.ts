import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

type StartResult = {
  attempt_id: string;
  expires_at: string;
  questions: unknown[];
  resumed: boolean;
  sections: Array<{ id: string; title: string; position: number; timeLimitMinutes: number }>;
  current_section_id: string | null;
  current_section_expires_at: string | null;
  section_finished: boolean;
  expired_attempt_submitted?: boolean;
  answers?: Array<{
    questionId: string;
    answer: unknown;
    flagged: boolean;
    savedAt?: string;
  }>;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT") {
    return NextResponse.json({ ok: false, message: "A student account is required." }, { status: 403 });
  }
  if (!(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized for your account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { examId?: string };
  if (!body.examId) return NextResponse.json({ ok: false, message: "Select an exam." }, { status: 400 });

  try {
    const attempt = await userRequest<StartResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_start_exam_sectioned",
      { method: "POST", body: JSON.stringify({ p_exam_id: body.examId }) },
    );

    if (attempt.section_finished) {
      await userRequest(
        auth.accessToken,
        "/rest/v1/rpc/intensive_submit_attempt_sectioned",
        { method: "POST", body: JSON.stringify({ p_attempt_id: attempt.attempt_id }) },
      );

      const resultQuery = new URLSearchParams({
        select: "final_score,total_marks,percentage,status,grading_status,is_published,published_at",
        attempt_id: "eq." + attempt.attempt_id,
        limit: "1",
      });
      const completedResults = await userRequest<Array<{
        final_score: number | null;
        total_marks: number;
        percentage: number | null;
        status: string | null;
        grading_status: string;
        is_published: boolean;
        published_at: string | null;
      }>>(
        auth.accessToken,
        "/rest/v1/intensive_results?" + resultQuery.toString(),
        { method: "GET" },
      );

      const sectionBreakdown = await userRequest<Array<{
        sectionId: string;
        title: string;
        score: number;
        totalMarks: number;
        percentage: number;
      }>>(
        auth.accessToken,
        "/rest/v1/rpc/intensive_attempt_score_breakdown",
        { method: "POST", body: JSON.stringify({ p_attempt_id: attempt.attempt_id }) },
      );

      return NextResponse.json({
        ok: true,
        attempt,
        answers: [],
        completedResult: completedResults[0] ?? null,
        sectionBreakdown,
      });
    }

    const answers = (attempt.answers ?? []).map((item) => ({
      question_id: item.questionId,
      answer: item.answer,
      is_flagged: Boolean(item.flagged),
    }));

    return NextResponse.json({ ok: true, attempt, answers });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    let message = "Unable to start the exam.";
    if (raw.includes("EXAM_NOT_OPEN")) message = "The exam is not open yet.";
    if (raw.includes("EXAM_CLOSED")) message = "The exam has closed.";
    if (raw.includes("NO_ATTEMPTS_REMAINING")) message = "No attempts remain.";
    if (raw.includes("EXAM_HAS_NO_QUESTIONS")) message = "No questions have been added to this exam yet.";
    if (raw.includes("EXAM_NOT_ASSIGNED")) message = "This exam is not assigned to your account.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
