"use client";

import { BRAND } from "@/lib/brand";
import { intensiveFetch } from "@/lib/intensive/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flag,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  RotateCcw,
  Target,
  Lightbulb,
} from "lucide-react";

type ExamInfo = {
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

type QuestionOption = { id: string; label: string; value: string };
type Question = {
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
  options: QuestionOption[] | null;
};
type SectionState = {
  id: string;
  title: string;
  position: number;
  timeLimitMinutes: number;
};

type SectionProgressItem = {
  started_at?: string | null;
  expires_at?: string | null;
  completed_at?: string | null;
  attempt_count?: number;
  best_score?: number;
  best_percentage?: number;
  last_score?: number;
  last_percentage?: number;
  last_attempt_id?: string | null;
};

type Attempt = {
  attempt_id: string;
  expires_at: string;
  questions: Question[];
  resumed: boolean;
  sections: SectionState[];
  section_progress: Record<string, SectionProgressItem>;
  current_section_id: string | null;
  current_section_expires_at: string | null;
  section_finished: boolean;
};
type PublishedResult = {
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

type WrongReviewQuestion = {
  number: number;
  questionId: string;
  sectionTitle: string;
  skill: string;
  type: Question["type"];
  prompt: string;
  marks: number;
  earned: number;
  selectedAnswer: string;
  correctAnswer: string;
  passage: null | {
    title: string;
    body: string;
  };
  referenceSource?: string | null;
  referenceUnit?: string | null;
  referencePage?: string | null;
  referenceEvidence?: string | null;
};

type ReviewPayload = {
  score: number;
  totalMarks: number;
  percentage: number;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  wrongQuestions: WrongReviewQuestion[];
};

type SectionReviewQuestion = WrongReviewQuestion & {
  correctionEn: string;
  correctionAr: string;
  explanationEn: string;
  explanationAr: string;
  tipEn: string;
  tipAr: string;
};

type SectionResult = {
  sectionId: string;
  sectionTitle: string;
  sectionAttemptId: string;
  sectionAttemptNumber: number;
  attemptsAllowed: number;
  attemptsRemaining: number;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  questionCount: number;
  bestScore?: number;
  bestPercentage?: number;
  review: SectionReviewQuestion[];
  completedSections?: number;
  totalSections?: number;
  allSectionsCompleted?: boolean;
  sectionProgress?: Record<string, SectionProgressItem>;
  completedAt?: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
}

function hasAnswerValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export default function ExamRunner() {
  const params = useParams<{ examId: string }>();
  const examId = String(params?.examId ?? "");
  const [stage, setStage] = useState<"loading" | "intro" | "starting" | "section-select" | "active" | "section-result" | "done">("loading");
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [previewSections, setPreviewSections] = useState<SectionState[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [publishedResult, setPublishedResult] = useState<PublishedResult | null>(null);
  const [sectionBreakdown, setSectionBreakdown] = useState<SectionScore[]>([]);
  const [pendingGrading, setPendingGrading] = useState(false);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [sectionResult, setSectionResult] = useState<SectionResult | null>(null);
  const [sectionResultLoading, setSectionResultLoading] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    async function loadExam() {
      const response = await intensiveFetch("/api/dashboard", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        window.location.replace("/");
        return;
      }
      const found = (payload.exams as ExamInfo[]).find((item) => item.id === examId);
      const foundCourse = ((payload.courses ?? []) as Array<{ id: string; code: string }>).find(
        (item) => item.id === found?.course_id,
      );
      setCourseCode(foundCourse?.code ?? "");
      if (!found) {
        setMessage("الاختبار غير موجود أو غير متاح لحسابك.");
        setStage("intro");
        return;
      }
      const sections = ((payload.sections ?? []) as Array<{
        id: string;
        exam_id: string;
        title: string;
        position: number;
        time_limit_minutes: number;
      }>)
        .filter((section) => section.exam_id === examId)
        .sort((a, b) => a.position - b.position)
        .map((section) => ({
          id: section.id,
          title: section.title,
          position: section.position,
          timeLimitMinutes: section.time_limit_minutes,
        }));
      setExam(found);
      setPreviewSections(sections);
      setStage("intro");
    }
    if (examId) loadExam();
  }, [examId]);

  const saveAnswer = useCallback(async (questionId: string, answer: unknown, flagged: boolean) => {
    if (!attempt) return;
    setSaveState("saving");
    const response = await intensiveFetch("/api/exam/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: attempt.attempt_id,
        questionId,
        answer,
        flagged,
      }),
    });
    if (response.ok) {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } else {
      setSaveState("error");
    }
  }, [attempt]);

  const queueSave = useCallback((questionId: string, answer: unknown, flagged: boolean) => {
    if (!attempt) return;
    if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(() => {
      void saveAnswer(questionId, answer, flagged);
    }, 450);
  }, [attempt, saveAnswer]);

  const flushCurrentSection = useCallback(async () => {
    if (!attempt?.current_section_id) return;

    const active = attempt.questions.filter(
      (question) => question.sectionId === attempt.current_section_id,
    );
    const pending = active.filter(
      (question) =>
        answers[question.id] !== undefined ||
        Boolean(flags[question.id]),
    );

    if (!pending.length) return;

    const responses = await Promise.all(
      pending.map((question) =>
        intensiveFetch("/api/exam/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.attempt_id,
            questionId: question.id,
            answer: answers[question.id] ?? null,
            flagged: Boolean(flags[question.id]),
          }),
        }),
      ),
    );

    if (responses.some((response) => !response.ok)) {
      setSaveState("error");
      throw new Error("تعذر حفظ بعض الإجابات. تحقق من اتصالك ثم حاول مرة أخرى.");
    }

    setSaveState("saved");
  }, [answers, attempt, flags]);

  function updateAnswer(questionId: string, value: unknown) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    queueSave(questionId, value, Boolean(flags[questionId]));
  }

  function toggleFlag(questionId: string) {
    const next = !flags[questionId];
    setFlags((current) => ({ ...current, [questionId]: next }));
    queueSave(questionId, answers[questionId] ?? null, next);
  }

  async function loadReview(attemptId: string) {
    setReviewLoading(true);
    try {
      const response = await intensiveFetch(
        "/api/exam/review?attemptId=" + encodeURIComponent(attemptId),
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (response.ok) {
        setReview(payload as ReviewPayload);
      } else {
        setReview(null);
      }
    } catch {
      setReview(null);
    } finally {
      setReviewLoading(false);
    }
  }

  async function startExam() {
    setMessage("");
    setStage("starting");
    const response = await intensiveFetch("/api/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.message || "تعذر بدء الاختبار.");
      setStage("intro");
      return;
    }

    const incoming = payload.attempt as Attempt;
    const restoredAnswers: Record<string, unknown> = {};
    const restoredFlags: Record<string, boolean> = {};
    for (const item of payload.answers ?? []) {
      restoredAnswers[item.question_id] = item.answer;
      restoredFlags[item.question_id] = Boolean(item.is_flagged);
    }

    if (payload.completedResult) {
      setAttempt(incoming);
      setPublishedResult(payload.completedResult as PublishedResult);
      setSectionBreakdown((payload.sectionBreakdown ?? []) as SectionScore[]);
      setPendingGrading(false);
      void loadReview(incoming.attempt_id);
      setStage("done");
      return;
    }

    setAttempt({
      ...incoming,
      section_progress: incoming.section_progress ?? {},
    });
    setAnswers(restoredAnswers);
    setFlags(restoredFlags);
    setCurrentIndex(0);

    if (incoming.current_section_id && incoming.current_section_expires_at) {
      setRemaining(Math.max(0, new Date(incoming.current_section_expires_at).getTime() - Date.now()));
      setStage("active");
      return;
    }

    if (incoming.section_finished) {
      setMessage("تم إكمال جميع الأقسام في هذه المحاولة.");
      setStage("section-select");
      return;
    }

    setRemaining(0);
    setStage("section-select");
  }

  async function loadSectionResult(sectionId: string) {
    if (!attempt || sectionResultLoading) return;
    setSectionResultLoading(true);
    setMessage("");
    try {
      const response = await intensiveFetch(
        "/api/exam/section/result?attemptId=" +
          encodeURIComponent(attempt.attempt_id) +
          "&sectionId=" +
          encodeURIComponent(sectionId),
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر تحميل نتيجة القسم.");
      setSectionResult(payload.result as SectionResult);
      setStage("section-result");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل نتيجة القسم.");
    } finally {
      setSectionResultLoading(false);
    }
  }

  async function selectSection(sectionId: string) {
    if (!attempt || advancing || submitting) return;
    setAdvancing(true);
    setMessage("");
    try {
      const response = await intensiveFetch("/api/exam/section/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.attempt_id, sectionId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر فتح القسم.");

      const expiresAt = String(payload.result?.sectionExpiresAt || "");
      const selectedId = String(payload.result?.sectionId || "");
      const resumed = Boolean(payload.result?.resumed);
      if (!selectedId || !expiresAt) throw new Error("تعذر تشغيل مؤقت القسم.");

      setAttempt((currentAttempt) =>
        currentAttempt
          ? {
              ...currentAttempt,
              current_section_id: selectedId,
              current_section_expires_at: expiresAt,
              section_progress: payload.result?.sectionProgress ?? currentAttempt.section_progress ?? {},
              section_finished: false,
            }
          : currentAttempt,
      );

      if (!resumed) {
        const sectionQuestionIds = new Set(
          (attempt.questions ?? [])
            .filter((question) => question.sectionId === selectedId)
            .map((question) => question.id),
        );
        setAnswers((current) =>
          Object.fromEntries(Object.entries(current).filter(([id]) => !sectionQuestionIds.has(id))),
        );
        setFlags((current) =>
          Object.fromEntries(Object.entries(current).filter(([id]) => !sectionQuestionIds.has(id))),
        );
      }

      setSectionResult(null);
      setCurrentIndex(0);
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
      setStage("active");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر فتح القسم.");
    } finally {
      setAdvancing(false);
    }
  }

  const submitAttempt = useCallback(async (automatic = false, skipFlush = false) => {
    if (!attempt || submitting) return;
    if (!automatic && !window.confirm("هل تريد تسليم الاختبار؟ لن تتمكن من تعديل الإجابات بعد التسليم.")) return;

    setSubmitting(true);
    setMessage("");
    try {
      Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));
      if (!skipFlush) {
        await flushCurrentSection();
      }

      const response = await intensiveFetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.attempt_id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر تسليم الاختبار.");

      setPublishedResult(payload.publishedResult ?? null);
      setSectionBreakdown((payload.sectionBreakdown ?? []) as SectionScore[]);
      setPendingGrading(Boolean(payload.result?.pending_grading));
      if (payload.publishedResult) {
        void loadReview(attempt.attempt_id);
      }
      setStage("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تسليم الاختبار.");
    } finally {
      setSubmitting(false);
    }
  }, [attempt, flushCurrentSection, submitting]);

  const completeSection = useCallback(async (automatic = false) => {
    if (!attempt || advancing || submitting) return;

    if (!automatic) {
      const active = attempt.questions.filter(
        (question) => question.sectionId === attempt.current_section_id,
      );
      const firstUnansweredIndex = active.findIndex(
        (question) => !hasAnswerValue(answers[question.id]),
      );

      if (firstUnansweredIndex >= 0) {
        setCurrentIndex(firstUnansweredIndex);
        setMessage("لا يمكن إنهاء الـSection قبل الإجابة عن جميع الأسئلة. تم نقلك إلى أول سؤال بدون إجابة. · Answer all questions before completing this section.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const confirmed = window.confirm(
        "هل تريد إنهاء هذا القسم؟ ستظهر درجتك والأخطاء والتصحيح مباشرة، ويمكنك إعادة المحاولة إذا بقيت لديك محاولات.",
      );
      if (!confirmed) return;
    }

    setAdvancing(true);
    setMessage("");

    try {
      Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));

      try {
        await flushCurrentSection();
      } catch (error) {
        if (!automatic) throw error;
        setSaveState("error");
      }

      const response = await intensiveFetch("/api/exam/section/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.attempt_id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إنهاء القسم.");

      const result = payload.result as SectionResult;
      const progress = result.sectionProgress ?? attempt.section_progress ?? {};

      setAttempt((currentAttempt) =>
        currentAttempt
          ? {
              ...currentAttempt,
              current_section_id: null,
              current_section_expires_at: null,
              section_progress: progress,
              section_finished: Boolean(result.allSectionsCompleted),
            }
          : currentAttempt,
      );
      setSectionResult(result);
      setCurrentIndex(0);
      setRemaining(0);
      setStage("section-result");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنهاء القسم.");
    } finally {
      setAdvancing(false);
    }
  }, [advancing, answers, attempt, flushCurrentSection, submitting]);

  useEffect(() => {
    if (stage !== "active" || !attempt?.current_section_expires_at) return;
    const update = () =>
      setRemaining(Math.max(0, new Date(attempt.current_section_expires_at as string).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.current_section_expires_at, stage]);

  useEffect(() => {
    if (stage === "active" && remaining === 0 && attempt && !submitting && !advancing) {
      void completeSection(true);
    }
  }, [completeSection, advancing, attempt, remaining, stage, submitting]);

  useEffect(() => {
    if (stage !== "active") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stage]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const questions = attempt?.questions ?? [];
  const sections = attempt?.sections ?? [];
  const normalizedCourseCode = courseCode.trim().toUpperCase();
  const isArabicGeneralExam = /^(AR|GR)/.test(normalizedCourseCode);
  const isTextbookReferencedExam = ["AR112", "GR101"].includes(normalizedCourseCode);
  const activeSectionId = attempt?.current_section_id ?? null;
  const activeQuestions = useMemo(
    () => questions.filter((question) => question.sectionId === activeSectionId),
    [activeSectionId, questions],
  );
  const current = activeQuestions[currentIndex];
  const answeredCount = useMemo(
    () => activeQuestions.filter((question) => {
      const value = answers[question.id];
      return value !== undefined && value !== null && String(value).trim() !== "";
    }).length,
    [activeQuestions, answers],
  );
  const activeSectionIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeSectionId),
  );
  const activeSectionTitle = sections[activeSectionIndex]?.title ?? "";
  const isReadingSection =
    activeSectionTitle.toLowerCase() === "reading" &&
    activeQuestions.some((question) => Boolean(question.passage));

  const passageIds = isReadingSection
    ? activeQuestions.reduce<string[]>((list, question) => {
        const passageId = question.passage?.id;
        if (passageId && !list.includes(passageId)) list.push(passageId);
        return list;
      }, [])
    : [];

  const currentPassageId = isReadingSection
    ? current?.passage?.id ?? passageIds[0] ?? null
    : null;
  const currentPassageIndex = currentPassageId ? Math.max(0, passageIds.indexOf(currentPassageId)) : 0;

  const visibleQuestionEntries = activeQuestions
    .map((question, globalIndex) => ({ question, globalIndex }))
    .filter(({ question }) => !isReadingSection || question.passage?.id === currentPassageId);

  const localQuestionIndex = Math.max(
    0,
    visibleQuestionEntries.findIndex(({ globalIndex }) => globalIndex === currentIndex),
  );

  const passageAnsweredCount = visibleQuestionEntries.filter(({ question }) => {
    const value = answers[question.id];
    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;

  const hasNextPassage =
    isReadingSection && currentPassageIndex < passageIds.length - 1;

  const currentHasAnswer = current ? hasAnswerValue(answers[current.id]) : false;

  function requireCurrentAnswer() {
    if (currentHasAnswer) return true;
    setMessage("يجب تحديد إجابة للسؤال الحالي قبل الانتقال. · Answer the current question before continuing.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return false;
  }

  function goToQuestion(targetIndex: number) {
    if (targetIndex === currentIndex) return;
    if (!requireCurrentAnswer()) return;
    setMessage("");
    setCurrentIndex(targetIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveToNextPassage() {
    if (!hasNextPassage || !requireCurrentAnswer()) return;
    const nextPassageId = passageIds[currentPassageIndex + 1];
    const nextGlobalIndex = activeQuestions.findIndex(
      (question) => question.passage?.id === nextPassageId,
    );
    if (nextGlobalIndex >= 0) {
      setMessage("");
      setCurrentIndex(nextGlobalIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  const sectionCompleted = (sectionId: string) =>
    Boolean(attempt?.section_progress?.[sectionId]?.completed_at);
  const completedSectionsCount = sections.filter((section) => sectionCompleted(section.id)).length;
  const isFinalRemainingSection =
    sections.length > 0 &&
    sections.every((section) => section.id === activeSectionId || sectionCompleted(section.id));

  if (stage === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-[#1F2B5E]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 animate-spin" />
          <div className="font-black">جاري تجهيز الاختبار...</div>
        </div>
      </div>
    );
  }

  if (stage === "intro" || stage === "starting") {
    const now = Date.now();
    const beforeStart = exam ? now < new Date(exam.starts_at).getTime() : false;
    const afterEnd = exam ? now > new Date(exam.ends_at).getTime() : false;
    const uniformSectionMinutes =
      previewSections.length > 0 &&
      previewSections.every((section) => section.timeLimitMinutes === previewSections[0].timeLimitMinutes)
        ? previewSections[0].timeLimitMinutes
        : null;
    const timingSummary = uniformSectionMinutes
      ? uniformSectionMinutes + " دقيقة لكل قسم"
      : previewSections.length
        ? previewSections.map((section) => section.title + ": " + section.timeLimitMinutes + " min").join(" · ")
        : "أقسام بوقت مستقل";
    return (
      <div className="deluxe-canvas min-h-screen px-4 py-8 text-[#1F2B5E]">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#6f7489]">
            <ArrowRight size={17} /> العودة للوحة الطالب
          </Link>
          <div className="numo-premium-surface numo-metal-border overflow-hidden rounded-[2rem]">
            <div className="numo-hero-radiance bg-[linear-gradient(135deg,#17204B,#1F2B5E_58%,#303B78)] p-7 text-white sm:p-9">
              <div className="text-sm font-black text-[#e9c1ad]">{exam?.category ?? BRAND.nameEn}</div>
              <h1 className="mt-2 text-3xl font-black">{exam?.title ?? "Exam"}</h1>
            </div>
            <div className="p-6 sm:p-8">
              {exam ? (
                <div className="mb-7 grid gap-3 sm:grid-cols-2">
                  <div className="numo-card-lift rounded-2xl border border-[#ebe7ef] bg-[#faf9fb] p-4">
                    <Clock3 className="mb-2 text-[#6366F1]" />
                    <strong className="block">{isArabicGeneralExam ? "مدة الاختبار" : "Section timing"}</strong>
                    <span dir={isArabicGeneralExam ? "rtl" : "auto"} className="text-sm text-[#74798d]">
                      {isArabicGeneralExam ? `${exam.duration_minutes} دقيقة` : timingSummary}
                    </span>
                  </div>
                  <div className="numo-card-lift rounded-2xl border border-[#ebe7ef] bg-[#faf9fb] p-4">
                    <ShieldCheck className="mb-2 text-[#B1785C]" />
                    <strong className="block">{isArabicGeneralExam ? "المحاولات والإتاحة" : "Attempts & window"}</strong>
                    <span className="block text-sm text-[#74798d]">
                      {isArabicGeneralExam ? `${exam.attempts_allowed} محاولات` : `Up to ${exam.attempts_allowed} attempts`}
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-[#8a8e9e]">{formatDate(exam.starts_at)} — {formatDate(exam.ends_at)}</span>
                  </div>
                </div>
              ) : null}

              <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"rounded-2xl border border-[#e6e2eb] bg-[#fbfafc] p-5 " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                <h2 className="font-black">{isArabicGeneralExam ? "قبل البدء" : "Before you begin"}</h2>
                {isArabicGeneralExam ? (
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-[#686e84]">
                    <li>• مدة الميد ترم 60 دقيقة.</li>
                    <li>• لديك 4 محاولات مستقلة.</li>
                    <li>• تُحفظ إجاباتك تلقائيًا أثناء الحل.</li>
                    <li>• يجب اختيار إجابة قبل الانتقال إلى السؤال التالي.</li>
                    <li>• تظهر الدرجة والمراجعة بعد إنهاء المحاولة.</li>
                  </ul>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-[#686e84]">
                    <li>• Each section has its own independent timer.</li>
                    <li>• Your answers are saved automatically.</li>
                    <li>• Every question is required. You must answer the current question before moving to another one.</li>
                    <li>• You choose which section to start. There is no required order.</li>
                    <li>• When a section is completed or its timer expires, it is locked and you choose another remaining section.</li>
                    <li>• After the final section, your result is calculated and released immediately when all questions are auto-graded.</li>
                  </ul>
                )}
              </div>

              {message ? <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</div> : null}

              <button
                onClick={startExam}
                disabled={stage === "starting" || !exam || beforeStart || afterEnd}
                className="btn mt-6 w-full"
              >
                {stage === "starting" ? <><Loader2 size={18} className="animate-spin" /> {isArabicGeneralExam ? "جاري تجهيز الاختبار..." : "Starting exam..."}</> :
                  beforeStart ? (isArabicGeneralExam ? "الاختبار لم يبدأ بعد" : "The exam is not open yet") :
                  afterEnd ? (isArabicGeneralExam ? "انتهى وقت إتاحة الاختبار" : "The exam has closed") :
                  (isArabicGeneralExam ? "دخول قسم الميد ترم" : "Start / choose section")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "section-select" && attempt) {
    const canFinishExam = sections.length > 0 && completedSectionsCount === sections.length;

    return (
      <div className="deluxe-canvas min-h-screen px-3 py-6 text-[#1F2B5E] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#6f7489]">
            <ArrowRight size={17} /> العودة للوحة الطالب
          </Link>

          <section className="numo-premium-surface numo-metal-border overflow-hidden rounded-[2rem]">
            <div className="numo-hero-radiance bg-[linear-gradient(135deg,#17204B,#1F2B5E_58%,#303B78)] p-6 text-white sm:p-8">
              <div className="text-xs font-black uppercase tracking-[.16em] text-[#efc7b3]">
                {isArabicGeneralExam ? "قسم الاختبار" : "Choose your section"}
              </div>
              <h1 dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 text-2xl font-black sm:text-3xl " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                {exam?.title ?? "Exam"}
              </h1>
              <p dir={isArabicGeneralExam ? "rtl" : "auto"} className={"mt-3 max-w-2xl text-sm leading-7 text-white/80 " + (isArabicGeneralExam ? "text-right" : "")}>
                {isArabicGeneralExam
                  ? "اضغط على بطاقة القسم لبدء الاختبار. الأسئلة مرتبة من اليمين، وكل سؤال يعرض خياراته كاملة كما في الملف المعتمد. لديك 4 محاولات والنتيجة تظهر مباشرة بعد الإنهاء."
                  : "اختر أي Section تريد. بعد كل محاولة تظهر الدرجة والأخطاء والتصحيح مباشرة، ويمكنك إعادة المحاولة حتى حد المحاولات المسموح."}
              </p>
            </div>

            <div className="p-4 sm:p-7">
              <div dir={isArabicGeneralExam ? "rtl" : "auto"} className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ebe7ef] bg-gradient-to-l from-[#fbf7f4] to-[#f7f7ff] px-4 py-3 text-sm">
                <span className="font-black">
                  {isArabicGeneralExam
                    ? `المكتمل ${completedSectionsCount} من ${sections.length}`
                    : `Completed ${completedSectionsCount} / ${sections.length}`}
                </span>
                <span className="font-bold text-[#72778b]">
                  {isArabicGeneralExam
                    ? "أفضل نتيجة من المحاولات هي المعتمدة."
                    : "أفضل نتيجة لكل Section هي التي تدخل في النتيجة النهائية"}
                </span>
              </div>

              {message ? (
                <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                  {message}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                {sections.map((section) => {
                  const completed = sectionCompleted(section.id);
                  const count = questions.filter((question) => question.sectionId === section.id).length;
                  const progress = attempt.section_progress?.[section.id] ?? {};
                  const attemptCount = Number(progress.attempt_count ?? (completed ? 1 : 0));
                  const allowed = Number(exam?.attempts_allowed ?? 1);
                  const remainingAttempts = Math.max(0, allowed - attemptCount);
                  const bestPercentage = progress.best_percentage;

                  return (
                    <article
                      key={section.id}
                      className={
                        "numo-card-lift rounded-[1.4rem] border p-5 transition " +
                        (completed
                          ? "border-emerald-100 bg-emerald-50/60"
                          : "border-[#e0dce7] bg-white shadow-sm")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-[#B1785C]">
                            {isArabicGeneralExam ? `${courseCode || "GENERAL"} · MIDTERM` : `SECTION ${section.position}`}
                          </div>
                          <h2 dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-1 text-xl font-black " + (isArabicGeneralExam ? "text-right" : "")}>
                            {section.title}
                          </h2>
                        </div>
                        {completed ? (
                          <CheckCircle2 size={24} className="text-emerald-600" />
                        ) : (
                          <Clock3 size={22} className="text-[#6366F1]" />
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-xl bg-white/80 px-3 py-3">
                          <div className="text-lg font-black">{section.timeLimitMinutes}</div>
                          <div className="text-[11px] text-[#7b8092]">{isArabicGeneralExam ? "دقيقة" : "minutes"}</div>
                        </div>
                        <div className="rounded-xl bg-white/80 px-3 py-3">
                          <div className="text-lg font-black">{count}</div>
                          <div className="text-[11px] text-[#7b8092]">{isArabicGeneralExam ? "سؤال" : "questions"}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[#e7e3eb] bg-white px-3 py-2 text-xs font-black">
                        <span>{isArabicGeneralExam ? `${remainingAttempts} محاولات متبقية` : `${remainingAttempts} attempts left`}</span>
                        {bestPercentage !== undefined ? (
                          <span className="text-emerald-700">{isArabicGeneralExam ? "أفضل نتيجة" : "Best"} {Number(bestPercentage).toFixed(0)}%</span>
                        ) : (
                          <span className="text-[#85899a]">{isArabicGeneralExam ? "لم تتم المحاولة" : "Not attempted"}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={remainingAttempts <= 0 || advancing}
                        onClick={() => void selectSection(section.id)}
                        className="btn mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {advancing ? (
                          <><Loader2 size={17} className="animate-spin" /> {isArabicGeneralExam ? "جاري الفتح..." : "Opening..."}</>
                        ) : completed ? (
                          <><RotateCcw size={17} /> {isArabicGeneralExam ? "إعادة المحاولة" : "Try again"}</>
                        ) : (
                          <><Target size={17} /> {isArabicGeneralExam ? "ابدأ الاختبار" : "Start this section"}</>
                        )}
                      </button>

                      {completed ? (
                        <button
                          type="button"
                          disabled={sectionResultLoading}
                          onClick={() => void loadSectionResult(section.id)}
                          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dcd8e4] bg-white px-4 text-sm font-black text-[#1F2B5E]"
                        >
                          {sectionResultLoading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                          {isArabicGeneralExam ? "عرض الدرجة والتصحيح" : "View score & corrections"}
                        </button>
                      ) : null}

                      {remainingAttempts <= 0 ? (
                        <div className="mt-2 rounded-xl bg-[#f0eff4] px-3 py-2 text-center text-xs font-black text-[#777c8f]">
                          {isArabicGeneralExam ? "تم استخدام جميع المحاولات" : "All attempts used"}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              {canFinishExam ? (
                <div className="mt-6 rounded-2xl border border-[#dcd8e5] bg-[#faf9fc] p-4">
                  <div className="mb-3 text-center text-sm font-bold leading-7 text-[#6f7489]">
                    أكملت محاولة واحدة على الأقل في جميع الأقسام. يمكنك تحسين أي Section أولا، أو إنهاء الاختبار واعتماد أفضل درجة لكل قسم.
                  </div>
                  <button
                    onClick={() => void submitAttempt(false, true)}
                    disabled={submitting}
                    className="btn w-full"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Finish exam using best section scores
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (stage === "section-result" && attempt && sectionResult) {
    const hasRetry = sectionResult.attemptsRemaining > 0;

    return (
      <div className="min-h-screen bg-[#f5f6fa] px-3 py-6 text-[#1F2B5E] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <section className="numo-premium-surface numo-metal-border overflow-hidden rounded-[2rem]">
            <div className="numo-hero-radiance bg-[linear-gradient(135deg,#17204B,#1F2B5E_58%,#303B78)] p-6 text-white sm:p-8">
              <div className="text-xs font-black uppercase tracking-[.16em] text-[#efc7b3]">
                {isArabicGeneralExam ? "نتيجة المحاولة" : "SECTION RESULT"}
              </div>
              <h1 dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 text-3xl font-black " + (isArabicGeneralExam ? "text-right" : "")}>
                {sectionResult.sectionTitle}
              </h1>
              <div className="mt-2 text-sm text-white/75">
                {isArabicGeneralExam
                  ? `المحاولة ${sectionResult.sectionAttemptNumber} من ${sectionResult.attemptsAllowed}`
                  : `Attempt ${sectionResult.sectionAttemptNumber} of ${sectionResult.attemptsAllowed}`}
              </div>
            </div>

            <div className="p-4 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-[#1F2B5E] p-5 text-center text-white">
                  <div className="text-4xl font-black">{sectionResult.percentage.toFixed(0)}%</div>
                  <div className="mt-1 text-xs text-white/65">{isArabicGeneralExam ? "الدرجة" : "Section score"}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                  <div className="text-3xl font-black text-emerald-700">{sectionResult.correctCount}</div>
                  <div className="mt-1 text-xs font-bold text-emerald-700">{isArabicGeneralExam ? "صحيح" : "Correct"}</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-center">
                  <div className="text-3xl font-black text-rose-700">{sectionResult.wrongCount}</div>
                  <div className="mt-1 text-xs font-bold text-rose-700">{isArabicGeneralExam ? "خطأ / غير مجاب" : "Wrong / unanswered"}</div>
                </div>
                <div className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-5 text-center">
                  <div className="text-3xl font-black">{sectionResult.attemptsRemaining}</div>
                  <div className="mt-1 text-xs font-bold text-[#73788d]">{isArabicGeneralExam ? "المحاولات المتبقية" : "Attempts remaining"}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e7e2eb] bg-[#faf9fb] p-4 text-center">
                <span className="font-black">{sectionResult.score} / {sectionResult.totalMarks}</span>
                {sectionResult.bestPercentage !== undefined ? (
                  <span className="mr-3 text-sm font-bold text-emerald-700">
                    · {isArabicGeneralExam ? "الأفضل" : "Best"}: {Number(sectionResult.bestPercentage).toFixed(0)}%
                  </span>
                ) : null}
              </div>

              {sectionResult.wrongCount === 0 ? (
                <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-7 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={34} />
                  <div className="text-xl font-black text-emerald-800">ممتاز — جميع الإجابات صحيحة.</div>
                  <div className="mt-2 text-sm font-bold text-emerald-700">ممتاز، جميع إجاباتك صحيحة.</div>
                </div>
              ) : (
                <section className="mt-7">
                  <div className="mb-4">
                    <div className="text-xs font-black uppercase tracking-[.14em] text-[#B1785C]">
                      {isTextbookReferencedExam ? "مراجعة موثقة من المرجع" : (isArabicGeneralExam ? "مراجعة الإجابات" : "SMART REVIEW")}
                    </div>
                    <h2 className="mt-1 text-2xl font-black">الأخطاء والتصحيح التفصيلي</h2>
                    <p className="mt-2 text-sm leading-7 text-[#73788d]">
                      {isTextbookReferencedExam
                        ? "لكل خطأ ستظهر إجابتك، والإجابة الصحيحة، والدليل من كتاب المقرر، ثم الوحدة ورقم الصفحة."
                        : isArabicGeneralExam
                          ? "تظهر هنا إجابتك والإجابة الصحيحة لكل سؤال أخطأت فيه."
                          : "لكل خطأ ستجد إجابتك، الإجابة الصحيحة، سبب التصحيح بالإنجليزية والعربية، ثم نصيحة للمحاولة التالية."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {sectionResult.review.map((item) => (
                      <article key={item.questionId} className="overflow-hidden rounded-2xl border border-[#e5e1e9] bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeaf2] bg-[#faf9fb] px-4 py-3">
                          <div className="text-xs font-black text-[#B1785C]">
                            {isArabicGeneralExam ? `السؤال ${item.number}` : `Question ${item.number}`} · {item.skill}
                          </div>
                          <div className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">
                            {item.earned} / {item.marks}
                          </div>
                        </div>

                        <div className="p-4 sm:p-5">
                          {item.passage?.title ? (
                            <div className="mb-3 rounded-xl bg-[#fdf8f5] px-3 py-2 text-xs font-black text-[#9a6249]" dir="ltr">
                              Passage: {item.passage.title}
                            </div>
                          ) : null}

                          <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"whitespace-pre-wrap text-base font-black leading-8 text-[#1F2B5E] " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                            {item.prompt}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                              <div className="text-xs font-black text-rose-700">Your answer · إجابتك</div>
                              <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 font-bold leading-7 text-rose-900 " + (isArabicGeneralExam ? "text-right" : "text-left")}>{item.selectedAnswer}</div>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                              <div className="text-xs font-black text-emerald-700">Correct answer · الإجابة الصحيحة</div>
                              <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 font-bold leading-7 text-emerald-900 " + (isArabicGeneralExam ? "text-right" : "text-left")}>{item.correctAnswer}</div>
                            </div>
                          </div>

                          {isArabicGeneralExam && item.referenceEvidence ? (
                            <div dir="rtl" className="mt-4 space-y-3 text-right">
                              <div className="rounded-xl border border-[#e8ddd7] bg-[#fdf8f5] p-4">
                                <div className="flex items-center justify-end gap-2 text-sm font-black text-[#8d5b45]">
                                  <span>التصحيح</span><CheckCircle2 size={17} />
                                </div>
                                <p className="mt-2 text-sm font-bold leading-7 text-[#5d514c]">{item.correctionAr}</p>
                              </div>
                              <div className="rounded-xl border border-[#dfe4f2] bg-[#f7f8fc] p-4">
                                <div className="flex items-center justify-end gap-2 text-sm font-black text-[#1F2B5E]">
                                  <span>الدليل من الكتاب</span><BookOpen size={17} />
                                </div>
                                <p className="mt-2 text-sm font-semibold leading-8 text-[#3f465d]">
                                  {item.referenceEvidence}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[#eadfd8] bg-white p-4 shadow-sm">
                                <div className="text-xs font-black text-[#B1785C]">المصدر المعتمد</div>
                                <div className="mt-2 text-sm font-black leading-7 text-[#1F2B5E]">
                                  {item.referenceSource}
                                </div>
                                <div className="mt-1 text-sm font-bold leading-7 text-[#62687d]">
                                  {item.referenceUnit ? item.referenceUnit + " · " : ""}
                                  {item.referencePage ? "صفحة " + item.referencePage : ""}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-xl border border-[#e0e4f2] bg-[#f7f8fc] p-4" dir="ltr">
                                  <div className="flex items-center gap-2 text-sm font-black text-[#1F2B5E]">
                                    <BookOpen size={16} /> English explanation
                                  </div>
                                  <p className="mt-2 text-left text-sm font-semibold leading-7 text-[#4f566d]">{item.correctionEn}</p>
                                  <p className="mt-2 text-left text-sm leading-7 text-[#4f566d]">{item.explanationEn}</p>
                                </div>
                                <div className="rounded-xl border border-[#eee1d9] bg-[#fdf8f5] p-4" dir="rtl">
                                  <div className="flex items-center gap-2 text-sm font-black text-[#8d5b45]">
                                    <BookOpen size={16} /> الشرح بالعربية
                                  </div>
                                  <p className="mt-2 text-right text-sm font-semibold leading-7 text-[#5d514c]">{item.correctionAr}</p>
                                  <p className="mt-2 text-right text-sm leading-7 text-[#5d514c]">{item.explanationAr}</p>
                                </div>
                              </div>
                              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                                <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                                  <Lightbulb size={16} /> Learning tip · نصيحة للتعلم
                                </div>
                                <p dir="ltr" className="mt-2 text-left text-xs leading-6 text-amber-900">{item.tipEn}</p>
                                <p dir="rtl" className="mt-1 text-right text-xs leading-6 text-amber-900">{item.tipAr}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {hasRetry ? (
                  <button
                    type="button"
                    onClick={() => void selectSection(sectionResult.sectionId)}
                    disabled={advancing}
                    className="btn w-full"
                  >
                    {advancing ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                    {isArabicGeneralExam ? "إعادة المحاولة" : "Try again · إعادة المحاولة"}
                  </button>
                ) : (
                  <div className="flex min-h-12 items-center justify-center rounded-xl bg-[#f0eff4] px-4 text-sm font-black text-[#74798d]">
                    تم استخدام جميع المحاولات
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSectionResult(null);
                    setStage("section-select");
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dcd8e4] bg-white px-4 font-black"
                >
                  {isArabicGeneralExam ? "العودة إلى قسم الاختبار" : "Choose another Section"}
                </button>
              </div>

              {sectionResult.allSectionsCompleted ? (
                <button
                  type="button"
                  onClick={() => void submitAttempt(false, true)}
                  disabled={submitting}
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B1785C] px-4 font-black text-white"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isArabicGeneralExam ? "إنهاء الاختبار واعتماد أفضل نتيجة" : "Finish exam & calculate overall best score"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="deluxe-canvas grid min-h-screen place-items-center px-4 py-10 text-[#1F2B5E]">
        <div className="numo-premium-surface numo-metal-border w-full max-w-5xl rounded-[2rem] p-6 text-center sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="mt-5 text-3xl font-black">تم تسليم الاختبار</h1>

          {publishedResult ? (
            <>
              <div className="numo-hero-radiance mt-7 rounded-2xl bg-[linear-gradient(135deg,#17204B,#1F2B5E_62%,#303B78)] p-6 text-white shadow-[0_20px_46px_rgba(31,43,94,.22)]">
                <div className="text-sm text-white/70">نتيجتك</div>
                <div className="mt-2 text-5xl font-black">{publishedResult.percentage ?? 0}%</div>
                <div className="mt-2 text-sm text-white/75">
                  {publishedResult.final_score ?? 0} of {publishedResult.total_marks}
                </div>
              </div>
              {sectionBreakdown.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {sectionBreakdown.map((section) => (
                    <div key={section.sectionId} className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-4 text-left">
                      <div className="text-xs font-black text-[#B1785C]">{section.title}</div>
                      <div className="mt-2 text-2xl font-black text-[#1F2B5E]">{section.percentage}%</div>
                      <div className="mt-1 text-xs font-bold text-[#73788d]">{section.score} / {section.totalMarks}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-7 rounded-2xl border border-[#e7e2eb] bg-[#faf9fb] p-6">
              <h2 className="font-black">{pendingGrading ? "Written answers are awaiting grading" : "Your result will be available later"}</h2>
              <p className="mt-2 text-sm leading-7 text-[#73788d]">
                Your attempt was saved and submitted. Your result will appear when it is released.
              </p>
            </div>
          )}

          {publishedResult ? (
            <section className="mt-7 text-right">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-black tracking-wide text-[#B1785C]">مراجعة المحاولة</div>
                  <h2 className="mt-1 text-2xl font-black">الأسئلة التي أخطأت فيها</h2>
                  <p className="mt-1 text-sm leading-7 text-[#73788d]">
                    تظهر لك إجابتك والإجابة الصحيحة بعد انتهاء المحاولة.
                  </p>
                </div>
                {review ? (
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                      صحيح: {review.correctCount}
                    </span>
                    <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-700">
                      خطأ: {review.wrongCount}
                    </span>
                  </div>
                ) : null}
              </div>

              {reviewLoading ? (
                <div className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-5 text-center text-sm font-black text-[#73788d]">
                  <Loader2 className="mx-auto mb-2 animate-spin" size={18} />
                  جاري تحميل مراجعة الإجابات...
                </div>
              ) : review?.wrongCount === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={28} />
                  <div className="text-lg font-black text-emerald-800">رائع، جميع إجاباتك صحيحة.</div>
                </div>
              ) : review?.wrongQuestions?.length ? (
                <div className="space-y-4">
                  {review.wrongQuestions.map((item) => (
                    <article key={item.questionId} className="overflow-hidden rounded-2xl border border-[#e7e2eb] bg-white text-right">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf2] bg-[#faf9fb] px-4 py-3">
                        <div className="text-xs font-black text-[#B1785C]">
                          السؤال {item.number} · {item.skill}
                        </div>
                        <div className="text-xs font-black text-rose-700">
                          {item.earned} / {item.marks}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        {item.passage ? (
                          <div className="mb-4 rounded-xl border border-[#eee7e3] bg-[#fdf9f7] p-3">
                            <div dir="ltr" className="text-left text-xs font-black text-[#9a6249]">
                              {item.passage.title}
                            </div>
                          </div>
                        ) : null}

                        <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"whitespace-pre-wrap font-black leading-8 text-[#1F2B5E] " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                          {item.prompt}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                            <div className="text-xs font-black text-rose-700">إجابتك</div>
                            <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 font-bold leading-7 text-rose-900 " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                              {item.selectedAnswer}
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-black text-emerald-700">الإجابة الصحيحة</div>
                            <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className={"mt-2 font-bold leading-7 text-emerald-900 " + (isArabicGeneralExam ? "text-right" : "text-left")}>
                              {item.correctAnswer}
                            </div>
                          </div>
                        </div>
                        {isArabicGeneralExam && item.referenceEvidence ? (
                          <div dir="rtl" className="mt-4 space-y-3 text-right">
                            <div className="rounded-xl border border-[#dfe4f2] bg-[#f7f8fc] p-4">
                              <div className="flex items-center justify-end gap-2 text-sm font-black text-[#1F2B5E]">
                                <span>الدليل من الكتاب</span><BookOpen size={17} />
                              </div>
                              <p className="mt-2 text-sm font-semibold leading-8 text-[#3f465d]">{item.referenceEvidence}</p>
                            </div>
                            <div className="rounded-xl border border-[#eadfd8] bg-white p-4">
                              <div className="text-xs font-black text-[#B1785C]">المصدر</div>
                              <div className="mt-2 text-sm font-black leading-7 text-[#1F2B5E]">{item.referenceSource}</div>
                              <div className="mt-1 text-sm font-bold text-[#62687d]">
                                {item.referenceUnit ? item.referenceUnit + " · " : ""}
                                {item.referencePage ? "صفحة " + item.referencePage : ""}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-5 text-center text-sm text-[#73788d]">
                  لا توجد مراجعة متاحة لهذه المحاولة.
                </div>
              )}
            </section>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href={"/results/" + examId}
              className="inline-flex min-h-[3.1rem] items-center justify-center rounded-xl border border-[#dcd7e4] bg-white px-4 font-black text-[#1F2B5E] shadow-sm"
            >
              عرض سجل المحاولات
            </Link>
            <Link href="/" className="btn w-full">العودة إلى {BRAND.nameAr}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!current || !attempt) return null;

  const answer = answers[current.id];
  const answerLocked = remaining <= 0 || advancing || submitting;
  const progress = activeQuestions.length ? Math.round((answeredCount / activeQuestions.length) * 100) : 0;

  return (
    <div className="deluxe-canvas min-h-screen min-w-0 overflow-x-hidden text-[#1F2B5E]">
      <header className="sticky top-0 z-30 border-b border-[#e0dce6] bg-white/95 shadow-[0_10px_30px_rgba(31,43,94,.08)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-stretch gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.1em] text-[#B1785C]" dir="ltr">{BRAND.nameEn}</div>
            <div className="mt-1 text-xs font-black text-[#B1785C]">{exam?.category}</div>
            <h1 className="font-black">{exam?.title}</h1>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end sm:gap-3">
            <div className={
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black " +
              (remaining < 5 * 60 * 1000 ? "bg-rose-50 text-rose-700" : "bg-[#f1f2ff] text-[#1F2B5E]")
            }>
              <Clock3 size={17} />
              <span>{sections[activeSectionIndex]?.title ?? "Section"}</span>
              <span dir="ltr">{formatRemaining(remaining)}</span>
            </div>
            <div className="hidden items-center gap-2 text-xs font-bold text-[#74798d] sm:flex">
              {saveState === "saving" ? <><Loader2 size={14} className="animate-spin" /> {isArabicGeneralExam ? "جاري الحفظ..." : "Saving..."}</> : null}
              {saveState === "saved" ? <><Save size={14} /> {isArabicGeneralExam ? "تم الحفظ" : "Saved"}</> : null}
              {saveState === "error" ? <span className="text-rose-600">{isArabicGeneralExam ? "تعذر الحفظ" : "Save failed"}</span> : null}
            </div>
          </div>
        </div>
        <div className="h-1 bg-[#eceaf0]">
          <div className="h-full bg-gradient-to-l from-[#B1785C] to-[#6366F1] transition-all" style={{ width: progress + "%" }} />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-1 gap-4 px-3 py-4 sm:px-6 sm:py-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-[#e3dfe8] bg-white p-3 shadow-sm xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black text-[#B1785C]">{sections[activeSectionIndex]?.title ?? "Section"}</div>
              <div className="text-sm font-black">
                {isReadingSection
                  ? `Passage ${currentPassageIndex + 1} of ${passageIds.length} · Question ${localQuestionIndex + 1} of ${visibleQuestionEntries.length}`
                  : isArabicGeneralExam
                    ? `السؤال ${currentIndex + 1} من ${activeQuestions.length}`
                    : `Question ${currentIndex + 1} of ${activeQuestions.length}`}
              </div>
            </div>
            <div className="rounded-lg bg-[#f4f2f7] px-2.5 py-1.5 text-xs font-black text-[#686e84]">
              {isReadingSection
                ? passageAnsweredCount + "/" + visibleQuestionEntries.length + " answered"
                : isArabicGeneralExam
                  ? answeredCount + " / " + activeQuestions.length + " مجاب"
                  : answeredCount + "/" + activeQuestions.length + " answered"}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={
                  "shrink-0 rounded-lg px-3 py-2 text-[11px] font-black " +
                  (sectionCompleted(section.id)
                    ? "bg-emerald-50 text-emerald-700"
                    : section.id === activeSectionId
                      ? "bg-[#1F2B5E] text-white"
                      : "bg-[#f8f7fa] text-[#9a9eac]")
                }
              >
                {section.position}. {section.title}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {visibleQuestionEntries.map(({ question, globalIndex }, index) => {
              const filled =
                answers[question.id] !== undefined &&
                answers[question.id] !== null &&
                String(answers[question.id]).trim() !== "";
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToQuestion(globalIndex)}
                  className={
                    "relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-xs font-black " +
                    (globalIndex === currentIndex
                      ? "border-[#1F2B5E] bg-[#1F2B5E] text-white"
                      : filled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#e1dde6] bg-white text-[#686e84]")
                  }
                >
                  {index + 1}
                  {flags[question.id] ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#B1785C]" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="hidden rounded-[1.5rem] border border-[#e3dfe8] bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:block xl:h-fit">
          <div className="mb-4 flex items-center justify-between">
            <strong>{isReadingSection ? `Passage ${currentPassageIndex + 1} of ${passageIds.length}` : (isArabicGeneralExam ? "الأسئلة" : "Questions")}</strong>
            <span className="text-xs font-black text-[#74798d]">
              {isReadingSection
                ? passageAnsweredCount + "/" + visibleQuestionEntries.length
                : answeredCount + "/" + activeQuestions.length}
            </span>
          </div>

          <div className="mb-4 space-y-2">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={
                  "rounded-lg px-3 py-2 text-xs font-black " +
                  (sectionCompleted(section.id)
                    ? "bg-emerald-50 text-emerald-700"
                    : section.id === activeSectionId
                      ? "bg-[#1F2B5E] text-white"
                      : "bg-[#f8f7fa] text-[#9a9eac]")
                }
              >
                {section.position}. {section.title}
                <span className="ml-2 font-bold opacity-70">
                  {sectionCompleted(section.id)
                    ? (isArabicGeneralExam ? "مكتمل" : "Completed")
                    : section.id === activeSectionId
                      ? (isArabicGeneralExam ? section.timeLimitMinutes + " دقيقة" : section.timeLimitMinutes + " min")
                      : (isArabicGeneralExam ? "متاح" : "Available")}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {visibleQuestionEntries.map(({ question, globalIndex }, index) => {
              const filled = answers[question.id] !== undefined && answers[question.id] !== null && String(answers[question.id]).trim() !== "";
              return (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(globalIndex)}
                  className={
                    "relative grid aspect-square place-items-center rounded-lg border text-sm font-black transition " +
                    (globalIndex === currentIndex
                      ? "border-[#1F2B5E] bg-[#1F2B5E] text-white"
                      : filled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#e1dde6] bg-white text-[#686e84]")
                  }
                >
                  {index + 1}
                  {flags[question.id] ? <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#B1785C]" /> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 w-full overflow-hidden">
          <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-[#e3dfe8] bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="text-xs font-black text-[#B1785C]">{current.sectionTitle} · {current.skill}</div>
              <div className="mt-1 font-black">
                {isReadingSection
                  ? `Passage ${currentPassageIndex + 1} of ${passageIds.length} · Question ${localQuestionIndex + 1} of ${visibleQuestionEntries.length}`
                  : isArabicGeneralExam
                    ? `السؤال ${currentIndex + 1} من ${activeQuestions.length} · القسم ${activeSectionIndex + 1} من ${sections.length}`
                    : `Question ${currentIndex + 1} of ${activeQuestions.length} · Section ${activeSectionIndex + 1} of ${sections.length}`}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#f4f2f7] px-3 py-2 text-xs font-black">
                {isArabicGeneralExam ? `${current.marks} درجة` : `${current.marks} marks`}
              </span>
              <button
                disabled={answerLocked}
                onClick={() => toggleFlag(current.id)}
                className={
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black " +
                  (flags[current.id] ? "border-[#B1785C] bg-[#fbf3ef] text-[#9a6249]" : "border-[#ded9e4] bg-white text-[#70758a]")
                }
              >
                <Flag size={15} /> Flag for review
              </button>
            </div>
          </div>

          <div className={"grid min-w-0 gap-4 sm:gap-5 " + (current.passage ? "2xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]" : "")}>
            {current.passage ? (
              <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[#e1dde7] bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-[#B1785C]">
                  <BookOpen size={19} />
                  <strong>
                    {isReadingSection ? `Passage ${currentPassageIndex + 1} of ${passageIds.length} · ` : ""}
                    {current.passage.title}
                  </strong>
                </div>
                <div dir="ltr" className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap break-words text-left text-[15px] leading-8 text-[#3e4356] sm:max-h-none sm:text-base sm:leading-9">
                  {current.passage.body}
                </div>
                {current.passage.imageUrl ? (
                  <img src={current.passage.imageUrl} alt="" className="mt-5 max-h-80 w-full rounded-xl object-contain" />
                ) : null}
              </section>
            ) : null}

            <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[#dfe2ec] bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#B1785C]">
                  {isArabicGeneralExam
                    ? `السؤال ${isReadingSection ? localQuestionIndex + 1 : currentIndex + 1} من ${isReadingSection ? visibleQuestionEntries.length : activeQuestions.length}`
                    : `Question ${isReadingSection ? localQuestionIndex + 1 : currentIndex + 1}`}
                </div>
                {isArabicGeneralExam ? (
                  <div className="rounded-full bg-[#eef0f7] px-3 py-1.5 text-[11px] font-black text-[#1F2B5E]">
                    {courseCode} · MIDTERM
                  </div>
                ) : null}
              </div>
              <div
                dir={isArabicGeneralExam ? "rtl" : "ltr"}
                className={
                  "w-full break-words rounded-[1.35rem] border border-[#d9ddea] bg-gradient-to-br from-white to-[#f7f8fc] px-4 py-5 text-[1.05rem] font-black leading-8 text-[#1F2B5E] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_10px_30px_rgba(31,43,94,.05)] sm:px-6 sm:py-7 sm:text-xl sm:leading-10 " +
                  (isArabicGeneralExam ? "text-right" : "text-left")
                }
              >
                {current.prompt || "Question text is unavailable. Please contact NUMO support."}
              </div>

              {current.type === "MULTIPLE_CHOICE" ? (
                <div dir={isArabicGeneralExam ? "rtl" : "ltr"} className="mt-5 grid gap-3 sm:mt-7 sm:grid-cols-2">
                  {(current.options ?? []).map((option) => {
                    const optionText =
                      option.value && option.value !== option.label ? option.value : option.label;
                    const compactLabel = option.label.trim().length <= 3;
                    const selected = answer === option.id;
                    return (
                      <label
                        key={option.id}
                        className={
                          "group flex min-h-[4.5rem] w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-all duration-200 sm:px-5 " +
                          (selected
                            ? "border-[#6366F1] bg-[#f3f3ff] shadow-[0_10px_28px_rgba(99,102,241,.12)] ring-1 ring-[#6366F1]/20"
                            : "border-[#e1dde7] bg-white hover:-translate-y-0.5 hover:border-[#B1785C]/55 hover:shadow-[0_10px_24px_rgba(31,43,94,.07)]")
                        }
                      >
                        <input
                          type="radio"
                          name={"q-" + current.id}
                          className="sr-only"
                          checked={selected}
                          disabled={answerLocked}
                          onChange={() => updateAnswer(current.id, option.id)}
                        />
                        {compactLabel ? (
                          <span
                            className={
                              "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-black transition " +
                              (selected
                                ? "bg-[#1F2B5E] text-white"
                                : "bg-[#eef0f7] text-[#1F2B5E] group-hover:bg-[#fbf2ed] group-hover:text-[#8f5b43]")
                            }
                          >
                            {option.label}
                          </span>
                        ) : null}
                        <span
                          dir="auto"
                          className={
                            "min-w-0 flex-1 break-words text-[15px] font-bold leading-7 text-[#303750] sm:text-base " +
                            (isArabicGeneralExam ? "text-right" : "text-left")
                          }
                        >
                          {optionText}
                        </span>
                        {selected ? <CheckCircle2 className="shrink-0 text-[#6366F1]" size={21} /> : null}
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {current.type === "TRUE_FALSE" ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {(current.options ?? []).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={answerLocked}
                      onClick={() => updateAnswer(current.id, option.value)}
                      className={
                        "rounded-2xl border p-5 text-lg font-black transition " +
                        (String(answer ?? "") === option.value
                          ? "border-[#6366F1] bg-[#f3f3ff] text-[#1F2B5E]"
                          : "border-[#e4e0e8] bg-white hover:bg-[#faf9fb]")
                      }
                    >
                      {option.value === "true" ? "True" : option.value === "false" ? "False" : option.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {current.type === "SHORT_ANSWER" ? (
                <textarea
                  className="field mt-7 min-h-44 text-base leading-8"
                  placeholder="اكتب إجابتك هنا..."
                  dir="auto"
                  value={String(answer ?? "")}
                  disabled={answerLocked}
                  onChange={(event) => updateAnswer(current.id, event.target.value)}
                />
              ) : null}
            </section>
          </div>

          {remaining === 0 && (advancing || submitting) ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e3dfe8] bg-white p-4 text-sm font-black text-[#1F2B5E]">
              <Loader2 size={17} className="animate-spin" />
              Finalizing this section and saving your latest answers...
            </div>
          ) : null}

          {message ? <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</div> : null}

          {!currentHasAnswer ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800">
              <ShieldCheck size={17} />
              {isArabicGeneralExam ? "يجب اختيار إجابة قبل الانتقال للسؤال التالي" : "Answer required to continue · يجب اختيار إجابة للمتابعة"}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-[#e3dfe8] bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:p-4">
            <button
              type="button"
              disabled={isReadingSection ? localQuestionIndex === 0 : currentIndex === 0}
              onClick={() => {
                if (isReadingSection) {
                  const previous = visibleQuestionEntries[localQuestionIndex - 1];
                  if (previous) goToQuestion(previous.globalIndex);
                } else {
                  goToQuestion(Math.max(0, currentIndex - 1));
                }
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#ddd8e4] bg-white px-3 text-sm font-black disabled:opacity-40 sm:w-auto sm:px-4 sm:text-base"
            >
              <ArrowRight size={18} /> {isArabicGeneralExam ? "السابق" : "Previous"}
            </button>

            {isReadingSection && localQuestionIndex < visibleQuestionEntries.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  const next = visibleQuestionEntries[localQuestionIndex + 1];
                  if (next) goToQuestion(next.globalIndex);
                }}
                className="btn w-full px-3 text-sm sm:w-auto sm:px-5 sm:text-base"
              >
                Next Question <ArrowLeft size={18} />
              </button>
            ) : isReadingSection && hasNextPassage ? (
              <button
                type="button"
                onClick={moveToNextPassage}
                className="btn col-span-2 w-full px-3 text-sm sm:col-span-1 sm:w-auto sm:px-5 sm:text-base"
              >
                Next Passage <BookOpen size={18} />
              </button>
            ) : !isReadingSection && currentIndex < activeQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => goToQuestion(Math.min(activeQuestions.length - 1, currentIndex + 1))}
                className="btn w-full px-3 text-sm sm:w-auto sm:px-5 sm:text-base"
              >
                {isArabicGeneralExam ? "التالي" : "Next"} <ArrowLeft size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void completeSection(false)}
                disabled={submitting || advancing}
                className="btn col-span-2 w-full px-3 text-sm sm:col-span-1 sm:w-auto sm:px-5 sm:text-base"
              >
                {advancing || submitting ? <Loader2 size={18} className="animate-spin" /> : isFinalRemainingSection ? <Send size={18} /> : <ArrowLeft size={18} />}
                {isArabicGeneralExam
                  ? (isFinalRemainingSection ? "إنهاء الاختبار وعرض النتيجة" : "إنهاء القسم")
                  : (isFinalRemainingSection ? "Complete final section & show result" : "Complete section & choose another")}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
