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

/**
 * The EL098 question bank already contains source-checked explanations.
 * Always show these immediately; an unavailable AI gateway must never hide
 * the student's selected option, authoritative answer, or academic reason.
 */
function sourceLockedExplanation(args: {
  skill: string;
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  reference: ReferenceRow | null;
}) {
  const { skill, prompt, selectedAnswer, correctAnswer, reference } = args;
  const reason = (reference?.explanation ?? "").trim();
  const evidence = (reference?.reference_evidence ?? "").trim();
  const subject =
    skill === "READING" ? "معلومات قطعة القراءة" :
    skill === "VOCABULARY" ? "معنى الكلمة وسياق الجملة" :
    "القاعدة أو تركيب الجملة";

  // A known internal inconsistency between the supplied reading passage
  // ("ate salad") and its supplied answer key ("True"). Preserve the source
  // answer but never invent a supporting quotation or present it as proven.
  if (prompt.trim() === "At lunchtime, Tom had a burger and fries.") {
    return {
      whyIncorrect: `اختيارك «${selectedAnswer}» يختلف عن مفتاح التجميعات المعتمد، الذي يحدد «${correctAnswer}».`,
      whyCorrect: `الإجابة المعتمدة في ملف الأسئلة هي «${correctAnswer}»، لكن نص القطعة يقول إن Tom أكل سلطة وقت الغداء (ate salad)، وهذا لا يدعم مفتاح الإجابة الوارد.`,
      academicExplanation: "تنبيه أكاديمي: يوجد تعارض بين الإجابة المعلّمة في المصدر ومحتوى القطعة. تم الحفاظ على المفتاح الأصلي ولم نغيّره أو ننسب إليه دليلاً غير موجود.",
      supportingQuote: null as string | null,
    };
  }
  if (prompt.trim() === "Did people have an easy life after the war in 1945?") {
    return {
      whyIncorrect: `الاختيار «${selectedAnswer}» يخالف الإجابة «${correctAnswer}» المحددة في ملف التجميعات.`,
      whyCorrect: `المفتاح المرفق يعتمد «${correctAnswer}» لهذا البند، لكن سؤال الصح والخطأ هنا لا يرفق نصًا تاريخيًا لإثبات المعلومة.`,
      academicExplanation: "التصحيح يعكس مفتاح التجميعات كما ورد، وليس تحققًا مستقلًا من حقيقة الحدث التاريخي.",
      supportingQuote: null as string | null,
    };
  }

  const rationale = reason || (evidence && !evidence.includes("الاختيار المعتمد") ? evidence : "");
  const whyIncorrect = rationale
    ? `الاختيار «${selectedAnswer}» لا يحقق المطلوب في ${subject}. ${rationale}`
    : `الاختيار «${selectedAnswer}» لا يطابق الإجابة «${correctAnswer}» المحددة في المصدر. لا يتوفر تعليل تفصيلي موثّق لهذا البند.`;
  const whyCorrect = rationale
    ? `الإجابة الصحيحة هي «${correctAnswer}». ${rationale}`
    : `المصدر المعتمد يحدد «${correctAnswer}» باعتبارها الإجابة الصحيحة.`;
  return {
    whyIncorrect,
    whyCorrect,
    academicExplanation: evidence && evidence !== reason ? evidence : null,
    supportingQuote: null as string | null,
  };
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
      const explanationRequested = request.nextUrl.searchParams.get("explain") === "1";
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
          }, !explanationRequested, request.headers.get("x-vercel-oidc-token"));

      const sourceFeedback = isCorrect ? null : sourceLockedExplanation({
        skill,
        prompt: question.prompt ?? "",
        selectedAnswer,
        correctAnswer,
        reference,
      });
      const resolvedFeedback = wrongFeedback ?? sourceFeedback;

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
              explanationPending: false,
              whyIncorrect: resolvedFeedback?.whyIncorrect ?? null,
              whyCorrect: resolvedFeedback?.whyCorrect ?? null,
              academicExplanation: resolvedFeedback?.academicExplanation ?? null,
              referenceSource: reference?.reference_source ?? null,
              referenceUnit: reference?.reference_unit ?? null,
              referencePage: reference?.reference_page ?? null,
              referenceEvidence: wrongFeedback?.supportingQuote ?? sourceFeedback?.academicExplanation ?? null,
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
