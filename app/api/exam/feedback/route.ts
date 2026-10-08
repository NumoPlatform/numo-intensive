import { NextRequest, NextResponse } from "next/server";
import { getEl098WrongFeedback } from "@/lib/intensive/el098-wrong-feedback";
import {
  authenticateRequest,
  serviceRequest,
  verifyStudentDevice,
} from "@/lib/intensive/server";

type SnapshotOption = { id: string; label: string; value: string };
type SnapshotQuestion = {
  id: string;
  marks: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: SnapshotOption[] | null;
  prompt?: string;
  passage?: null | { body?: string; title?: string };
};

type AttemptRow = {
  id: string;
  exam_id: string;
  student_id: string;
  question_snapshot: SnapshotQuestion[];
};

type KeyRow = {
  key_data: Array<{
    questionId: string;
    type: SnapshotQuestion["type"];
    marks: number;
    correctOptionId: string | null;
    correctBoolean: boolean | null;
    acceptableAnswers: string[];
  }>;
};

type AnswerRow = {
  answer: unknown;
  score: number | null;
};

type ReferenceRow = {
  skill: string | null;
  explanation: string | null;
  reference_source: string | null;
  reference_unit: string | null;
  reference_page: string | null;
  reference_evidence: string | null;
};

function scalar(value: unknown) {
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionText(question: SnapshotQuestion, optionId: string) {
  const option = question.options?.find((item) => item.id === optionId);
  if (!option) return optionId;
  return option.value && option.value !== option.label ? option.value : option.label;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "انتهت الجلسة." }, { status: 401 });
  }
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "هذا الجهاز غير مصرح له." }, { status: 403 });
  }

  const attemptId = request.nextUrl.searchParams.get("attemptId")?.trim() ?? "";
  const questionId = request.nextUrl.searchParams.get("questionId")?.trim() ?? "";
  if (!attemptId || !questionId) {
    return NextResponse.json({ ok: false, message: "بيانات السؤال غير مكتملة." }, { status: 400 });
  }

  try {
    const attempts = await serviceRequest<AttemptRow[]>(
      "/rest/v1/intensive_exam_attempts?" +
        new URLSearchParams({
          select: "id,exam_id,student_id,question_snapshot",
          id: "eq." + attemptId,
          student_id: "eq." + auth.profile.id,
          limit: "1",
        }).toString(),
    );
    const attempt = attempts[0];
    if (!attempt) {
      return NextResponse.json({ ok: false, message: "المحاولة غير موجودة." }, { status: 404 });
    }

    const question = (attempt.question_snapshot ?? []).find((item) => item.id === questionId);
    if (!question) {
      return NextResponse.json({ ok: false, message: "السؤال غير موجود في هذه المحاولة." }, { status: 404 });
    }

    const [exams, answers, keys, references] = await Promise.all([
      serviceRequest<Array<{ course_id: string }>>(
        "/rest/v1/intensive_exams?" +
          new URLSearchParams({ select: "course_id", id: "eq." + attempt.exam_id, limit: "1" }).toString(),
      ),
      serviceRequest<AnswerRow[]>(
        "/rest/v1/intensive_student_answers?" +
          new URLSearchParams({
            select: "answer,score",
            attempt_id: "eq." + attemptId,
            question_id: "eq." + questionId,
            limit: "1",
          }).toString(),
      ),
      serviceRequest<KeyRow[]>(
        "/rest/v1/intensive_attempt_keys?" +
          new URLSearchParams({ select: "key_data", attempt_id: "eq." + attemptId, limit: "1" }).toString(),
      ),
      serviceRequest<ReferenceRow[]>(
        "/rest/v1/intensive_questions?" +
          new URLSearchParams({
            select: "skill,explanation,reference_source,reference_unit,reference_page,reference_evidence",
            id: "eq." + questionId,
            limit: "1",
          }).toString(),
      ),
    ]);

    const answer = answers[0];
    if (!answer) {
      return NextResponse.json({ ok: false, message: "أجب عن السؤال أولاً." }, { status: 409 });
    }

    const courseId = exams[0]?.course_id;
    const courses = courseId
      ? await serviceRequest<Array<{ code: string }>>(
          "/rest/v1/intensive_courses?" +
            new URLSearchParams({ select: "code", id: "eq." + courseId, limit: "1" }).toString(),
        )
      : [];
    const courseCode = (courses[0]?.code ?? "").trim().toUpperCase();
    if (!["GR101", "EL098"].includes(courseCode)) {
      return NextResponse.json({ ok: false, message: "التصحيح الفوري غير مفعل لهذا المقرر." }, { status: 403 });
    }

    const key = (keys[0]?.key_data ?? []).find((item) => item.questionId === questionId);
    if (!key) {
      return NextResponse.json({ ok: false, message: "تعذر تحميل مفتاح التصحيح." }, { status: 404 });
    }

    const selectedRaw = scalar(answer.answer);
    let selectedAnswer = selectedRaw || "لم تتم الإجابة";
    let correctAnswer = "";

    if (question.type === "MULTIPLE_CHOICE") {
      selectedAnswer = selectedRaw ? optionText(question, selectedRaw) : "لم تتم الإجابة";
      correctAnswer = key.correctOptionId ? optionText(question, key.correctOptionId) : "";
    } else if (question.type === "TRUE_FALSE") {
      selectedAnswer =
        selectedRaw.toLowerCase() === "true" ? "صح" :
        selectedRaw.toLowerCase() === "false" ? "خطأ" : "لم تتم الإجابة";
      correctAnswer = key.correctBoolean ? "صح" : "خطأ";
    } else {
      correctAnswer = (key.acceptableAnswers ?? []).join(" / ");
    }

    const maxMarks = Number(question.marks ?? key.marks ?? 0);
    const earned = Number(answer.score ?? 0);
    const reference = references[0] ?? null;

    const isCorrect = maxMarks > 0 && earned >= maxMarks;
    const skill = (reference?.skill ?? "").trim().toUpperCase();

    if (courseCode === "EL098") {
      // Source-locked answer verification remains unchanged. AI never chooses the key.
      // Generate detailed feedback only AFTER a student's incorrect choice was saved.
      const wrongFeedback = isCorrect
        ? null
        : await getEl098WrongFeedback({
            questionId,
            selectedOptionId: selectedRaw,
            correctOptionId: key.correctOptionId ?? "",
            skill,
            prompt: question.prompt ?? "",
            selectedAnswer,
            correctAnswer,
            passageBody: question.passage?.body ?? null,
          });

      return NextResponse.json({
        ok: true,
        feedback: isCorrect
          ? {
              questionId,
              isCorrect: true,
              selectedAnswer,
              correctAnswer,
            }
          : {
              questionId,
              isCorrect: false,
              selectedAnswer,
              correctAnswer,
              correction: "إجابتك خاطئة",
              whyIncorrect: wrongFeedback?.whyIncorrect ?? null,
              whyCorrect: wrongFeedback?.whyCorrect ?? null,
              academicExplanation: wrongFeedback?.academicExplanation ?? null,
              referenceSource: reference?.reference_source ?? null,
              referenceUnit: reference?.reference_unit ?? null,
              referencePage: reference?.reference_page ?? null,
              referenceEvidence: wrongFeedback?.supportingQuote ?? null,
            },
      });
    }

    return NextResponse.json({
      ok: true,
      feedback: {
        questionId,
        isCorrect,
        selectedAnswer,
        correctAnswer,
        correction: isCorrect
          ? "إجابتك صحيحة وفق المرجع المعتمد."
          : "إجابتك غير صحيحة. راجع الإجابة الصحيحة والدليل من المنهج أدناه.",
        referenceSource: reference?.reference_source ?? null,
        referenceUnit: reference?.reference_unit ?? null,
        referencePage: reference?.reference_page ?? null,
        referenceEvidence: reference?.reference_evidence ?? null,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "تعذر تحميل التصحيح الفوري." }, { status: 500 });
  }
}
