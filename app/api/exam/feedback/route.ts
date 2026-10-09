import { NextRequest, NextResponse } from "next/server";
import { getIntensiveEnglishWrongFeedback } from "@/lib/intensive/el098-wrong-feedback";
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

  // Instructor-reviewed foundational English grammar rule. This is a
  // teaching explanation, not a quotation claimed to appear in the source PDF.
  if (prompt.trim() === "These are _______ flowers." &&
      correctAnswer.trim().toLowerCase() === "my sister's") {
    const selected = selectedAnswer.trim().toLowerCase();
    const wrongReason = selected === "my sister"
      ? "my sister تعني «أختي»، وهي عبارة صحيحة لوحدها، لكنها لا تعبّر عن ملكية الزهور. نحتاج أن نربط sister بكلمة flowers بعلامة الملكية؛ لذلك لا تكفي my sister."
      : selected === "my sisters"
        ? "my sisters تعني «أخواتي» بصيغة الجمع، لكن العبارة لا تحتوي على علامة الملكية. وإذا كان الشيء يخص أكثر من أخت، فإن الصياغة تكون my sisters' flowers، لا my sisters flowers."
        : selected === "mine sister's"
          ? "mine ضمير ملكية مستقل نستخدمه دون اسم بعده، مثل This book is mine. أما sister فهو اسم يلي الضمير؛ لذا يجب استخدام my وليس mine: my sister's."
          : "هذا الاختيار لا يوضح الملكية بالطريقة المناسبة قبل اسم flowers؛ ابحث عن علامة الملكية مع الاسم الذي يملك الزهور.";
    return {
      whyIncorrect: `اخترت «${selectedAnswer}». ${wrongReason} لاحظ أن المطلوب ليس تعريف الشخص فقط، بل توضيح أن الزهور تخصه؛ وهذه هي الفكرة التي أغفلها الاختيار.`,
      whyCorrect: `الإجابة الصحيحة «${correctAnswer}» تحقق قاعدة Possessive Nouns: نضيف apostrophe ثم s إلى الاسم المفرد لنبين أن شيئًا يخص هذا الشخص. خطوات الحل: (1) نحدد المالك: sister. (2) نحدد الشيء المملوك: flowers. (3) نحول sister إلى sister's. وبذلك تصبح الجملة These are my sister's flowers، ومعناها «هذه زهور أختي».`,
      academicExplanation: [
        "القاعدة بالتفصيل: عندما نريد التعبير عن ملكية اسم مفرد في اللغة الإنجليزية، نضع علامة الفاصلة العليا (apostrophe) متبوعة بالحرف s بعد اسم المالك: sister → sister's. هذه العلامة تختلف تمامًا عن s الجمع.",
        "طريقة الحل خطوة بخطوة: اقرأ الاسم الذي يأتي بعد الفراغ وهو flowers. اسأل نفسك: زهور مَن؟ الإجابة: الأخت. إذن نحتاج عبارة ملكية لا عبارة تصف الأخت فقط. لهذا نختار my sister's.",
        "مثال تدريبي 1: This is my brother's bag. = هذه حقيبة أخي. أضفنا 's إلى brother لأن الحقيبة تخصه.",
        "مثال تدريبي 2: Those are the teacher's books. = تلك كتب المعلم. أضفنا 's إلى teacher لأن الكتب تخص المعلم.",
        "الخلاصة الذهبية: my sister = أختي؛ my sister's = شيء يخص أختي؛ my sisters' = شيء يخص أخواتي؛ mine ضمير ملكية مستقل لا يأتي قبل اسم مثل sister. في الاختبار، حدّد المالك والشيء المملوك أولًا، ثم اختر علامة الملكية المناسبة.",
      ].join("\n\n"),
      supportingQuote: null as string | null,
    };
  }

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
    // All NUMO objective questions use the per-attempt frozen answer key.
    // Writing and free-response questions are never auto-explained by this route.
    if (!["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
      return NextResponse.json({ ok: false, message: "التصحيح الفوري مخصص للأسئلة الموضوعية." }, { status: 403 });
    }

    const key = (keys[0]?.key_data ?? []).find((item) => item.questionId === questionId);
    if (!key) {
      return NextResponse.json({ ok: false, message: "تعذر تحميل مفتاح التصحيح." }, { status: 404 });
    }

    const selectedRaw = scalar(answer.answer);
    if (!selectedRaw || selectedRaw === "null") {
      return NextResponse.json({ ok: false, message: "أجب عن السؤال أولاً." }, { status: 409 });
    }
    let selectedAnswer = selectedRaw;
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

    const reference = references[0] ?? null;
    // A correct answer is validated against the frozen option key and never
    // guessed by Gemini or inferred from mutable bank content.
    if (question.type === "MULTIPLE_CHOICE" && !key.correctOptionId) {
      return NextResponse.json({ ok: false, message: "مفتاح الإجابة لهذا السؤال غير مكتمل." }, { status: 409 });
    }
    if (question.type === "TRUE_FALSE" && typeof key.correctBoolean !== "boolean") {
      return NextResponse.json({ ok: false, message: "مفتاح الإجابة لهذا السؤال غير مكتمل." }, { status: 409 });
    }
    const isCorrect = question.type === "MULTIPLE_CHOICE"
      ? selectedRaw === key.correctOptionId
      : selectedRaw.toLowerCase() === String(key.correctBoolean);
    const skill = (reference?.skill ?? "").trim().toUpperCase();

    if (courseCode.startsWith("EL")) {
      const explanationRequested = request.nextUrl.searchParams.get("explain") === "1";
      // Source-locked answer verification remains unchanged. AI never chooses the key.
      // Generate detailed feedback only AFTER a student's incorrect choice was saved.
      const wrongFeedback = isCorrect
        ? null
        : await getIntensiveEnglishWrongFeedback({
            questionId,
            selectedOptionId: selectedRaw,
            correctOptionId: question.type === "MULTIPLE_CHOICE"
              ? key.correctOptionId ?? ""
              : String(key.correctBoolean),
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
      const sourceReason = (reference?.explanation ?? "").trim();
      // Existing one-sentence bank notes cannot substitute for the requested
      // extended academic lesson. Display reliable grading immediately, then
      // request detailed teaching asynchronously, caching by source question
      // and selected wrong option.
      const hasRealSourceTeaching =
        sourceReason.length >= 200 &&
        /(?:قاعدة|الملكية|الجملة|السبب|نستخدم|تستخدم|تدل|تعني)/.test(sourceReason);
      const keyCannotBeExplainedFromSource =
        question.prompt?.trim() === "At lunchtime, Tom had a burger and fries." ||
        question.prompt?.trim() === "Did people have an easy life after the war in 1945?";
      const sourceLesson = hasRealSourceTeaching || keyCannotBeExplainedFromSource
        ? sourceFeedback : null;
      const resolvedAcademicFeedback = wrongFeedback ?? sourceLesson;
      const isPendingAcademicExplanation =
        !isCorrect && !wrongFeedback && !keyCannotBeExplainedFromSource &&
        !explanationRequested &&
        (skill !== "READING" || Boolean(question.passage?.body));

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
              explanationPending: isPendingAcademicExplanation,
              whyIncorrect: resolvedAcademicFeedback?.whyIncorrect ?? null,
              whyCorrect: resolvedAcademicFeedback?.whyCorrect ?? null,
              academicExplanation: resolvedAcademicFeedback?.academicExplanation ?? null,
              referenceSource: reference?.reference_source ?? null,
              referenceUnit: reference?.reference_unit ?? null,
              referencePage: reference?.reference_page ?? null,
              referenceEvidence: wrongFeedback?.supportingQuote ??
                (reference?.reference_evidence || sourceFeedback?.academicExplanation || null),
            },
      });
    }

    // Never fabricate an academic rationale where the provided source only
    // supplied a marked correct option. Show the verified key instantly.
    const explanation = (reference?.explanation ?? "").trim();
    const referenceEvidence = (reference?.reference_evidence ?? "").trim();
    const rationale = explanation || referenceEvidence;
    return NextResponse.json({
      ok: true,
      feedback: {
        questionId,
        isCorrect,
        selectedAnswer,
        correctAnswer,
        correction: isCorrect
          ? "إجابتك صحيحة وفق مفتاح الإجابة المعتمد."
          : "إجابتك خاطئة — إليك التصحيح المعتمد.",
        whyIncorrect: isCorrect ? null
          : `اخترت «${selectedAnswer}»، وهذا لا يطابق الاختيار «${correctAnswer}» المثبت في مفتاح الاختبار.`,
        whyCorrect: isCorrect ? null
          : rationale
            ? `الإجابة المعتمدة «${correctAnswer}». ${rationale}`
            : `الإجابة المعتمدة في مفتاح الاختبار هي «${correctAnswer}». لا يتوفر شرح أكاديمي مفصل وموثّق لهذا السؤال في بنك الأسئلة الحالي.`,
        academicExplanation: explanation && referenceEvidence && explanation !== referenceEvidence
          ? referenceEvidence : null,
        explanationPending: false,
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
