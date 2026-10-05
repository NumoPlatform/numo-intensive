import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  serviceRequest,
  verifyStudentDevice,
} from "@/lib/intensive/server";

type SnapshotOption = { id: string; label: string; value: string };
type SnapshotQuestion = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  skill: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  prompt: string;
  marks: number;
  passage: null | {
    id: string;
    title: string;
    body: string;
    imageUrl?: string | null;
  };
  options: SnapshotOption[] | null;
};

type AttemptRow = {
  id: string;
  exam_id: string;
  student_id: string;
  status: string;
  question_snapshot: SnapshotQuestion[];
  submitted_at: string | null;
};

type ExamRow = {
  id: string;
  title: string;
  allow_answer_review: boolean;
};

type ResultRow = {
  attempt_id: string;
  grading_status: string;
  is_published: boolean;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
};

type AnswerRow = {
  question_id: string;
  answer: unknown;
  score: number | null;
};

type AttemptKey = {
  questionId: string;
  type: SnapshotQuestion["type"];
  marks: number;
  correctOptionId: string | null;
  correctBoolean: boolean | null;
  acceptableAnswers: string[];
};

function scalar(value: unknown) {
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionLabel(question: SnapshotQuestion, optionId: string) {
  return question.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json(
      { ok: false, message: "انتهت الجلسة. سجل الدخول مرة أخرى." },
      { status: 401 },
    );
  }

  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json(
      { ok: false, message: "هذا الجهاز غير مصرح له بالدخول إلى الحساب." },
      { status: 403 },
    );
  }

  const attemptId = request.nextUrl.searchParams.get("attemptId")?.trim() ?? "";
  if (!attemptId) {
    return NextResponse.json(
      { ok: false, message: "حدد المحاولة لعرض المراجعة." },
      { status: 400 },
    );
  }

  try {
    const attempts = await serviceRequest<AttemptRow[]>(
      "/rest/v1/intensive_exam_attempts?" +
        new URLSearchParams({
          select: "id,exam_id,student_id,status,question_snapshot,submitted_at",
          id: "eq." + attemptId,
          student_id: "eq." + auth.profile.id,
          limit: "1",
        }).toString(),
    );
    const attempt = attempts[0];
    if (!attempt) {
      return NextResponse.json({ ok: false, message: "المحاولة غير موجودة." }, { status: 404 });
    }

    const [exams, results, answers, keyRows] = await Promise.all([
      serviceRequest<ExamRow[]>(
        "/rest/v1/intensive_exams?" +
          new URLSearchParams({
            select: "id,title,allow_answer_review",
            id: "eq." + attempt.exam_id,
            limit: "1",
          }).toString(),
      ),
      serviceRequest<ResultRow[]>(
        "/rest/v1/intensive_results?" +
          new URLSearchParams({
            select: "attempt_id,grading_status,is_published,final_score,total_marks,percentage",
            attempt_id: "eq." + attemptId,
            limit: "1",
          }).toString(),
      ),
      serviceRequest<AnswerRow[]>(
        "/rest/v1/intensive_student_answers?" +
          new URLSearchParams({
            select: "question_id,answer,score",
            attempt_id: "eq." + attemptId,
          }).toString(),
      ),
      serviceRequest<Array<{ key_data: AttemptKey[] }>>(
        "/rest/v1/intensive_attempt_keys?" +
          new URLSearchParams({
            select: "key_data",
            attempt_id: "eq." + attemptId,
            limit: "1",
          }).toString(),
      ),
    ]);

    const exam = exams[0];
    const result = results[0];
    if (!exam || !result) {
      return NextResponse.json(
        { ok: false, message: "النتيجة غير متاحة لهذه المحاولة." },
        { status: 404 },
      );
    }

    if (!exam.allow_answer_review) {
      return NextResponse.json(
        { ok: false, message: "مراجعة الإجابات غير مفعلة لهذا الاختبار." },
        { status: 403 },
      );
    }

    if (!result.is_published || result.grading_status !== "COMPLETE") {
      return NextResponse.json(
        { ok: false, message: "تظهر الأسئلة الخاطئة بعد اكتمال ونشر النتيجة." },
        { status: 409 },
      );
    }

    const answerMap = new Map(answers.map((answer) => [answer.question_id, answer]));
    const keyMap = new Map((keyRows[0]?.key_data ?? []).map((key) => [key.questionId, key]));

    const wrongQuestions = (attempt.question_snapshot ?? []).flatMap((question, index) => {
      const answer = answerMap.get(question.id);
      const key = keyMap.get(question.id);
      const earned = Number(answer?.score ?? 0);
      const maxMarks = Number(question.marks ?? key?.marks ?? 0);
      if (earned >= maxMarks && maxMarks > 0) return [];

      const selectedRaw = scalar(answer?.answer);
      let selectedAnswer = selectedRaw || "لم تتم الإجابة";
      let correctAnswer = "";

      if (question.type === "MULTIPLE_CHOICE") {
        if (selectedRaw) selectedAnswer = optionLabel(question, selectedRaw);
        if (key?.correctOptionId) correctAnswer = optionLabel(question, key.correctOptionId);
      } else if (question.type === "TRUE_FALSE") {
        selectedAnswer =
          selectedRaw.toLowerCase() === "true"
            ? "True"
            : selectedRaw.toLowerCase() === "false"
              ? "False"
              : "لم تتم الإجابة";
        correctAnswer = key?.correctBoolean ? "True" : "False";
      } else {
        correctAnswer = (key?.acceptableAnswers ?? []).join(" / ");
      }

      return [{
        number: index + 1,
        questionId: question.id,
        sectionTitle: question.sectionTitle,
        skill: question.skill,
        type: question.type,
        prompt: question.prompt,
        marks: maxMarks,
        earned,
        selectedAnswer,
        correctAnswer,
        passage: question.passage
          ? {
              title: question.passage.title,
              body: question.passage.body,
            }
          : null,
      }];
    });

    const questionCount = attempt.question_snapshot?.length ?? 0;
    return NextResponse.json({
      ok: true,
      attemptId,
      examTitle: exam.title,
      score: result.final_score ?? 0,
      totalMarks: result.total_marks,
      percentage: result.percentage ?? 0,
      questionCount,
      correctCount: Math.max(0, questionCount - wrongQuestions.length),
      wrongCount: wrongQuestions.length,
      wrongQuestions,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "تعذر تحميل مراجعة الإجابات." },
      { status: 500 },
    );
  }
}
