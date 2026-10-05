import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, userRequest } from "@/lib/intensive/server";

type PendingAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: unknown;
  admin_feedback: string | null;
  saved_at: string;
};
type Attempt = {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  status: string;
  submitted_at: string | null;
};
type KeyRow = { attempt_id: string; key_data: Array<Record<string, unknown>> };

function inFilter(values: string[]) {
  return "in.(" + values.join(",") + ")";
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const answerQuery = new URLSearchParams({
    select: "id,attempt_id,question_id,answer,admin_feedback,saved_at",
    score: "is.null",
    order: "saved_at.asc",
    limit: "200",
  });
  const answers = await serviceRequest<PendingAnswer[]>("/rest/v1/intensive_student_answers?" + answerQuery.toString());
  if (!answers.length) return NextResponse.json({ ok: true, entries: [] });

  const attemptIds = [...new Set(answers.map((item) => item.attempt_id))];
  const attemptQuery = new URLSearchParams({
    select: "id,exam_id,student_id,attempt_number,status,submitted_at",
    id: inFilter(attemptIds),
  });
  const attempts = await serviceRequest<Attempt[]>("/rest/v1/intensive_exam_attempts?" + attemptQuery.toString());
  const submitted = attempts.filter((item) => item.status === "SUBMITTED");
  if (!submitted.length) return NextResponse.json({ ok: true, entries: [] });

  const submittedIds = new Set(submitted.map((item) => item.id));
  const filteredAnswers = answers.filter((item) => submittedIds.has(item.attempt_id));
  const questionIds = [...new Set(filteredAnswers.map((item) => item.question_id))];
  const studentIds = [...new Set(submitted.map((item) => item.student_id))];
  const examIds = [...new Set(submitted.map((item) => item.exam_id))];

  const [questions, students, exams, keys] = await Promise.all([
    serviceRequest<Array<{ id: string; prompt: string; type: string; skill: string }>>(
      "/rest/v1/intensive_questions?" + new URLSearchParams({
        select: "id,prompt,type,skill",
        id: inFilter(questionIds),
      }).toString(),
    ),
    serviceRequest<Array<{ id: string; full_name: string; username: string }>>(
      "/rest/v1/intensive_profiles?" + new URLSearchParams({
        select: "id,full_name,username",
        id: inFilter(studentIds),
      }).toString(),
    ),
    serviceRequest<Array<{ id: string; title: string; category: string; course_id: string }>>(
      "/rest/v1/intensive_exams?" + new URLSearchParams({
        select: "id,title,category,course_id",
        id: inFilter(examIds),
      }).toString(),
    ),
    serviceRequest<KeyRow[]>(
      "/rest/v1/intensive_attempt_keys?" + new URLSearchParams({
        select: "attempt_id,key_data",
        attempt_id: inFilter([...submittedIds]),
      }).toString(),
    ),
  ]);

  const attemptMap = new Map(submitted.map((item) => [item.id, item]));
  const questionMap = new Map(questions.map((item) => [item.id, item]));
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const examMap = new Map(exams.map((item) => [item.id, item]));
  const keyMap = new Map(keys.map((item) => [item.attempt_id, item.key_data]));

  const entries = filteredAnswers.map((answer) => {
    const attempt = attemptMap.get(answer.attempt_id);
    const key = (keyMap.get(answer.attempt_id) ?? []).find(
      (item) => String(item.questionId ?? "") === answer.question_id,
    );
    return {
      ...answer,
      maxMarks: Number(key?.marks ?? 0),
      question: questionMap.get(answer.question_id) ?? null,
      student: attempt ? studentMap.get(attempt.student_id) ?? null : null,
      exam: attempt ? examMap.get(attempt.exam_id) ?? null : null,
      attemptNumber: attempt?.attempt_number ?? null,
    };
  });

  return NextResponse.json({ ok: true, entries });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    answerId?: string;
    score?: number;
    feedback?: string;
    publishWhenComplete?: boolean;
  };
  if (!body.answerId) return NextResponse.json({ ok: false, message: "Select an answer." }, { status: 400 });

  const answerQuery = new URLSearchParams({
    select: "id,attempt_id,question_id,score",
    id: "eq." + body.answerId,
    limit: "1",
  });
  const answerRows = await serviceRequest<Array<{ id: string; attempt_id: string; question_id: string; score: number | null }>>(
    "/rest/v1/intensive_student_answers?" + answerQuery.toString(),
  );
  const answer = answerRows[0];
  if (!answer) return NextResponse.json({ ok: false, message: "Answer not found." }, { status: 404 });

  const keyQuery = new URLSearchParams({
    select: "key_data",
    attempt_id: "eq." + answer.attempt_id,
    limit: "1",
  });
  const keyRows = await serviceRequest<Array<{ key_data: Array<Record<string, unknown>> }>>(
    "/rest/v1/intensive_attempt_keys?" + keyQuery.toString(),
  );
  const key = (keyRows[0]?.key_data ?? []).find((item) => String(item.questionId ?? "") === answer.question_id);
  const maxMarks = Number(key?.marks ?? 0);
  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0 || score > maxMarks) {
    return NextResponse.json({ ok: false, message: "The score must be between 0 and " + maxMarks + "." }, { status: 400 });
  }

  await serviceRequest<unknown>("/rest/v1/intensive_student_answers?id=eq." + encodeURIComponent(answer.id), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      score,
      auto_graded: false,
      admin_feedback: String(body.feedback ?? "").trim() || null,
      graded_at: new Date().toISOString(),
      graded_by: auth.profile.id,
    }),
  });

  const remainingQuery = new URLSearchParams({
    select: "id",
    attempt_id: "eq." + answer.attempt_id,
    score: "is.null",
    limit: "1",
  });
  const remaining = await serviceRequest<Array<{ id: string }>>(
    "/rest/v1/intensive_student_answers?" + remainingQuery.toString(),
  );

  let finalized = null;
  if (!remaining.length) {
    finalized = await userRequest<Record<string, unknown>>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_finalize_grading",
      {
        method: "POST",
        body: JSON.stringify({
          p_attempt_id: answer.attempt_id,
          p_publish: Boolean(body.publishWhenComplete),
        }),
      },
    );
  }

  return NextResponse.json({ ok: true, finalized });
}
