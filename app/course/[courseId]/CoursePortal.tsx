"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GraduationCap,
  History,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { intensiveFetch } from "@/lib/intensive/client";
import NumoBrand from "@/app/components/NumoBrand";
import { courseCover, courseVisual } from "@/lib/intensive/ui";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  default_cover_url: string | null;
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
  section_progress: Record<string, {
    attempt_count?: number;
    best_percentage?: number;
    completed_at?: string | null;
  }>;
};
type Result = {
  attempt_id: string;
  exam_id: string;
  percentage: number | null;
  is_published: boolean;
};
type Dashboard = {
  profile: { full_name: string; role: "ADMIN" | "STUDENT" };
  courses: Course[];
  exams: Exam[];
  sections: Section[];
  attempts: Attempt[];
  results: Result[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export default function CoursePortal() {
  const params = useParams<{ courseId: string }>();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    intensiveFetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "تعذر تحميل المقرر.");
        if (payload.profile?.role === "ADMIN") {
          window.location.replace("/admin");
          return;
        }
        setData(payload);
      })
      .catch(() => window.location.replace("/"))
      .finally(() => setLoading(false));
  }, []);

  const course = useMemo(
    () => data?.courses.find((item) => item.id === params.courseId) ?? null,
    [data, params.courseId],
  );

  const exams = useMemo(
    () => (data?.exams ?? []).filter((exam) => exam.course_id === params.courseId),
    [data, params.courseId],
  );

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6fa] text-[#1F2B5E]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#d9d6e4] border-t-[#6366F1]" />
          <div className="font-black">جاري تحميل تفاصيل المقرر...</div>
        </div>
      </main>
    );
  }

  if (!data || !course) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6fa] px-4 text-[#1F2B5E]">
        <div className="max-w-md rounded-3xl border border-[#e3dfe8] bg-white p-8 text-center shadow-sm">
          <BookOpenCheck className="mx-auto mb-4 text-[#B1785C]" size={36} />
          <h1 className="text-2xl font-black">المقرر غير متاح</h1>
          <p className="mt-2 text-sm leading-7 text-[#777c8f]">قد يكون التسجيل في المقرر منتهيا أو تمت إزالته من حسابك.</p>
          <a href="/" className="btn mt-5 w-full"><ArrowRight size={17} /> العودة للرئيسية</a>
        </div>
      </main>
    );
  }

  const visual = courseVisual(course.code);
  const cover = courseCover(course.code, course.default_cover_url);
  const courseResults = data.results.filter((result) => exams.some((exam) => exam.id === result.exam_id));
  const best = [...courseResults]
    .filter((item) => item.percentage !== null)
    .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];
  const completed = new Set(courseResults.map((item) => item.exam_id)).size;

  const courseSections = (data.sections ?? [])
    .filter((section) => exams.some((exam) => exam.id === section.exam_id))
    .sort((a, b) => a.position - b.position);
  const sectionCount = courseSections.length;
  const primaryExam =
    exams.find((exam) => courseSections.filter((section) => section.exam_id === exam.id).length > 1) ??
    exams[0] ??
    null;

  const normalizedCourseCode = course.code.trim().toUpperCase();
  const isGeneralCourse =
    normalizedCourseCode.startsWith("GR") || normalizedCourseCode.startsWith("AR");
  const isEl098Quiz2 = normalizedCourseCode === "EL098";
  const isEl097Quiz2 = normalizedCourseCode === "EL097_EL099E";
  const el098ModelIcons = [ClipboardCheck, FileCheck2, GraduationCap, BookOpenCheck] as const;
  const generalExamDefinitions = [
    {
      category: "QUIZ 1",
      title: "تجميعات Quiz 1",
      duration: 30,
      Icon: ClipboardCheck,
      accent: "#6366F1",
      soft: "#F0F0FF",
    },
    {
      category: "QUIZ 2",
      title: "تجميعات Quiz 2",
      duration: 30,
      Icon: FileCheck2,
      accent: "#B1785C",
      soft: "#FBF2ED",
    },
    {
      category: "MIDTERM",
      title: "تجميعات Midterm",
      duration: 60,
      Icon: GraduationCap,
      accent: "#1F2B5E",
      soft: "#EEF0F7",
    },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#6f7488]">
            <ArrowRight size={17} /> العودة للرئيسية
          </a>
          <div className="flex min-w-0 items-center gap-3">
            <NumoBrand horizontal className="w-auto" />
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-xs font-black text-[#1F2B5E]">{BRAND.nameAr}</div>
              <div className="mt-1 truncate text-[9px] font-black tracking-[.1em] text-[#B1785C]" dir="ltr">{BRAND.nameEn}</div>
            </div>
          </div>
        </div>

        <section className="numo-premium-surface numo-metal-border overflow-hidden rounded-[1.8rem] sm:rounded-[2rem]">
          <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)] lg:items-stretch">
            <div className="relative flex items-center justify-center overflow-hidden bg-white p-2 sm:p-3 lg:p-4">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] border border-[#ece9ef] bg-white sm:rounded-[1.5rem]">
                <img
                  src={cover}
                  alt={"غلاف " + course.code}
                  width={1536}
                  height={864}
                  decoding="async"
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              </div>
            </div>

            <div className="numo-hero-radiance relative overflow-hidden bg-[linear-gradient(145deg,#182248,#1F2B5E_58%,#293873)] p-5 text-white sm:p-7 lg:flex lg:flex-col lg:justify-between lg:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full border border-[#B1785C]/25"
              />

              <div className="relative">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black text-[#efc7b3]">
                  {visual.level}
                </span>
                <div dir="ltr" className="mt-4 text-sm font-black tracking-[.16em] text-white/60">
                  {course.code}
                </div>
                <h1 dir="auto" className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">
                  {course.title}
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {isGeneralCourse
                    ? "اختر تجميعات Quiz 1 أو Quiz 2 أو Midterm. لكل اختبار 4 محاولات؛ الكويز 30 دقيقة والميد ترم 60 دقيقة، وتظهر النتيجة مباشرة بعد التسليم."
                    : isEl098Quiz2
                      ? "QUIZ 2 — أربعة نماذج تدريبية مستقلة. اختر أي نموذج ثم أي قسم: Grammar & Vocabulary أو Reading أو Writing. التصحيح الموضوعي فوري والمحاولات مفتوحة."
                      : isEl097Quiz2
                        ? "EL097 — QUIZ 2 | سبعة أقسام بالترتيب الأصلي للملف: Grammar Foundations، Verbs & Prepositions، Vocabulary & Definitions، ثلاث قطع Reading مستقلة، ثم Writing بسبعة موضوعات. راجع الإجابات بعد تسليم كل قسم."
                        : "اختر Grammar أو Vocabulary أو Reading. كل قسم مستقل وله وقته ومحاولاته، وتظهر نتيجتك مباشرة بعد التسليم."}
                </p>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-3 text-center">
                  <div className="text-xl font-black sm:text-2xl">
                    {isGeneralCourse ? 3 : isEl098Quiz2 ? 4 : (sectionCount || exams.length)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-white/55">
                    {isGeneralCourse ? "الاختبارات" : isEl098Quiz2 ? "النماذج" : "الأقسام"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-3 text-center">
                  <div className="text-xl font-black sm:text-2xl">{completed}</div>
                  <div className="mt-1 text-[10px] font-bold text-white/55">المكتمل</div>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-3 text-center">
                  <div className="text-xl font-black sm:text-2xl">
                    {best?.percentage ?? "—"}{best ? "%" : ""}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-white/55">أفضل درجة</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={"mt-6 grid gap-4 " + (isEl098Quiz2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
          {isGeneralCourse ? (
            generalExamDefinitions.map((definition) => {
              const exam = exams.find((item) => item.category === definition.category) ?? null;
              const examSections = exam
                ? courseSections.filter((section) => section.exam_id === exam.id)
                : [];
              const questionCount = examSections.reduce(
                (sum, section) => sum + Number(section.question_count ?? 0),
                0,
              );
              const attempts = exam
                ? data.attempts.filter((item) => item.exam_id === exam.id)
                : [];
              const results = exam
                ? data.results.filter((item) => item.exam_id === exam.id)
                : [];
              const bestResult = [...results]
                .filter((item) => item.percentage !== null)
                .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];
              const inProgress = attempts.find((item) => item.status === "IN_PROGRESS") ?? null;
              const usedAttempts = attempts.length
                ? Math.max(...attempts.map((item) => Number(item.attempt_number ?? 0)))
                : 0;
              // The examination RPC defines attempts_allowed=0 as unlimited.
              // Treat zero consistently here; never render "0 / 0" or falsely
              // prevent first-time students from opening their exam.
              const allowedAttempts = exam?.attempts_allowed ?? 4;
              const unlimitedAttempts = Boolean(exam && allowedAttempts === 0);
              const remaining = unlimitedAttempts ? null : Math.max(0, allowedAttempts - usedAttempts);
              const now = Date.now();
              const isOpen = exam
                ? now >= new Date(exam.starts_at).getTime() &&
                  now <= new Date(exam.ends_at).getTime()
                : false;
              const hasQuestions = questionCount > 0;
              const canEnter =
                Boolean(exam) &&
                hasQuestions &&
                isOpen &&
                (unlimitedAttempts || (remaining !== null && remaining > 0) || Boolean(inProgress));
              const Icon = definition.Icon;

              return (
                <article
                  key={definition.category}
                  className="numo-card-lift numo-metal-border overflow-hidden rounded-[1.7rem] border border-[#e3dfe8] bg-white shadow-[0_14px_38px_rgba(31,43,94,.07)]"
                >
                  <div className="h-2" style={{ background: definition.accent }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#B1785C]" dir="ltr">
                          {definition.category}
                        </div>
                        <h2 dir="auto" className="mt-1 break-words text-2xl font-black">
                          {definition.title}
                        </h2>
                      </div>
                      {canEnter && exam ? (
                        <a
                          href={"/exam/" + exam.id}
                          aria-label={"دخول " + definition.title}
                          className="numo-icon-medallion grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition hover:-translate-y-0.5"
                          style={{ background: definition.soft, color: definition.accent }}
                        >
                          <Icon size={25} />
                        </a>
                      ) : (
                        <div
                          className="numo-icon-medallion grid h-14 w-14 shrink-0 place-items-center rounded-2xl opacity-70"
                          style={{ background: definition.soft, color: definition.accent }}
                        >
                          <Icon size={25} />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <div className="flex items-center gap-1 font-black">
                          <Clock3 size={14} /> {exam?.duration_minutes ?? definition.duration} دقيقة
                        </div>
                        <div className="mt-1 text-[#868a9b]">{questionCount} سؤال</div>
                      </div>
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <div dir={unlimitedAttempts ? "rtl" : "ltr"} className="font-black">
                          {unlimitedAttempts ? "غير محدودة" : `${remaining ?? 4} / ${allowedAttempts}`}
                        </div>
                        <div className="mt-1 text-[#868a9b]">محاولات متبقية</div>
                      </div>
                    </div>

                    {bestResult ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-700">
                            <Award size={14} /> أفضل درجة
                          </span>
                          <span className="text-xl font-black text-emerald-800">
                            {Number(bestResult.percentage ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-[#e9e5ed] bg-[#faf9fb] p-3 text-xs leading-6 text-[#777c8f]">
                        {hasQuestions
                          ? "النتيجة تظهر مباشرة بعد التسليم مع إمكانية المراجعة."
                          : "تم تجهيز مسار الاختبار، وسيُفعّل فور إضافة الأسئلة المعتمدة."}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                      <span className="rounded-full bg-[#f2f1ff] px-2.5 py-1 text-[#5559ca]">
                        {unlimitedAttempts ? "محاولات غير محدودة" : `${allowedAttempts} محاولات`}
                      </span>
                      <span className="rounded-full bg-[#fbf2ed] px-2.5 py-1 text-[#956047]">
                        {definition.category === "MIDTERM" ? "60 دقيقة" : "30 دقيقة"}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">نتيجة مباشرة</span>
                    </div>

                    {canEnter && exam ? (
                      <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                        {usedAttempts > 0 ? <RotateCcw size={17} /> : <PlayCircle size={17} />}
                        {usedAttempts > 0 ? "إعادة المحاولة" : "دخول الاختبار"}
                      </a>
                    ) : (
                      <div className="mt-4 rounded-xl bg-[#f0eff4] px-4 py-3 text-center text-xs font-black text-[#7b8092]">
                        {!exam || !hasQuestions
                          ? "بانتظار إضافة الأسئلة"
                          : !isOpen
                            ? "الاختبار غير متاح حاليا"
                            : "تم استخدام جميع المحاولات"}
                      </div>
                    )}

                    {exam && results.length ? (
                      <a
                        href={"/results/" + exam.id}
                        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-3 text-xs font-black"
                      >
                        <History size={15} /> سجل النتائج
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : isEl097Quiz2 ? (
            courseSections.map((section) => {
              const exam = exams.find((item) => item.id === section.exam_id) ?? primaryExam;
              const attempts = exam ? data.attempts.filter((item) => item.exam_id === exam.id) : [];
              const latest = [...attempts].sort((a, b) => b.attempt_number - a.attempt_number)[0];
              const progress = latest?.section_progress?.[section.id];
              const done = Boolean(progress?.completed_at);
              const isOpen = Boolean(
                exam &&
                Date.now() >= new Date(exam.starts_at).getTime() &&
                Date.now() <= new Date(exam.ends_at).getTime()
              );
              const explanations: Record<number, string> = {
                1: "Pronouns, possessives & articles",
                2: "Verb forms and preposition choices",
                3: "Words, definitions & usage",
                4: "Reading Comprehension · Passage 01",
                5: "Reading Comprehension · Passage 02",
                6: "Reading Comprehension · Passage 03",
                7: "Choose ONE topic from the seven Writing prompts"
              };
              const Icon = section.position <= 2 ? ClipboardCheck :
                section.position === 3 ? BookOpenCheck :
                section.position <= 6 ? GraduationCap : FileCheck2;
              return (
                <article key={section.id} className="group relative overflow-hidden rounded-[1.6rem] border border-[#dedbe5] bg-white shadow-[0_14px_36px_rgba(31,43,94,.07)] transition duration-300 hover:-translate-y-1 hover:border-[#B1785C]/60 hover:shadow-[0_24px_48px_rgba(31,43,94,.12)] motion-reduce:transform-none">
                  <div className="h-1.5 bg-[#1F2B5E]" />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black tracking-[.13em] text-[#B1785C]" dir="ltr">
                          {String(section.position).padStart(2, "0")} / EL097 QUIZ 2
                        </div>
                        <h3 className="mt-2 text-xl font-black leading-8 text-[#1F2B5E]" dir="ltr">{section.title}</h3>
                      </div>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef0f7] text-[#6366F1]">
                        <Icon size={23} />
                      </div>
                    </div>
                    <p className="mt-2 min-h-10 text-sm font-semibold leading-6 text-[#72788e]" dir="ltr">
                      {explanations[section.position]}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-[#f1f2f9] px-3 py-1.5 text-[#1F2B5E]">
                        {section.position === 7 ? "7 writing topics" : `${section.question_count ?? 0} questions`}
                      </span>
                      <span className="rounded-full bg-[#faf0ea] px-3 py-1.5 text-[#9c644a]">
                        {section.time_limit_minutes} دقيقة
                      </span>
                      <span className={"rounded-full px-3 py-1.5 " + (done ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f2f9] text-[#73788f]")}>
                        {done ? "مكتمل" : "جاهز للتدريب"}
                      </span>
                    </div>
                    {progress?.best_percentage !== undefined ? (
                      <div className="mt-3 text-sm font-black text-emerald-700">
                        أفضل نتيجة {Number(progress.best_percentage).toFixed(0)}%
                      </div>
                    ) : null}
                    {exam && isOpen ? (
                      <a href={"/exam/" + exam.id} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1F2B5E] px-4 text-sm font-black text-white transition hover:bg-[#303f7e]">
                        <PlayCircle size={18} /> فتح الاختبار واختيار القسم
                      </a>
                    ) : (
                      <div className="mt-5 rounded-xl bg-[#f1f0f5] px-4 py-3 text-center text-sm font-bold text-[#777c90]">
                        القسم غير متاح حالياً
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : isEl098Quiz2 ? (
            [...exams]
              .sort((a, b) => a.title.localeCompare(b.title, "en"))
              .map((exam, modelIndex) => {
                const modelSections = courseSections.filter((section) => section.exam_id === exam.id);
                const attempts = data.attempts.filter((item) => item.exam_id === exam.id);
                const results = data.results.filter((item) => item.exam_id === exam.id);
                const activeAttempt =
                  attempts.find((item) => item.status === "IN_PROGRESS") ??
                  [...attempts].sort((a, b) => Number(b.attempt_number) - Number(a.attempt_number))[0];
                const completedSectionCount = modelSections.filter((section) =>
                  Boolean(activeAttempt?.section_progress?.[section.id]?.completed_at),
                ).length;
                const bestResult = [...results]
                  .filter((item) => item.percentage !== null)
                  .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];
                const questionCount = modelSections.reduce(
                  (sum, section) => sum + Number(section.question_count ?? 0),
                  0,
                );
                const now = Date.now();
                const isOpen =
                  now >= new Date(exam.starts_at).getTime() &&
                  now <= new Date(exam.ends_at).getTime();
                const canEnter = isOpen && questionCount === 29;
                const progress = modelSections.length
                  ? Math.round((completedSectionCount / modelSections.length) * 100)
                  : 0;
                const stateLabel =
                  bestResult || completedSectionCount === modelSections.length
                    ? "مكتمل"
                    : activeAttempt
                      ? "قيد التقدم"
                      : "جاهز للبدء";
                const Icon = el098ModelIcons[modelIndex % el098ModelIcons.length];
                const modelLabel = exam.title.split("—")[0]?.trim() || `MODEL 0${modelIndex + 1}`;
                const arabicLabel = exam.title.split("—")[1]?.trim() || `النموذج ${modelIndex + 1}`;

                return (
                  <article
                    key={exam.id}
                    className="group numo-card-lift relative overflow-hidden rounded-[1.8rem] border border-[#B1785C]/35 bg-[#FAF9F6] shadow-[0_16px_42px_rgba(31,43,94,.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#B1785C]/70 hover:shadow-[0_24px_58px_rgba(31,43,94,.13)] motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <div className="h-2 bg-[#1F2B5E]" />
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div
                            dir="ltr"
                            className="text-[11px] font-black uppercase tracking-[.2em] text-[#B1785C]"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            EL098 · QUIZ 2
                          </div>
                          <h2
                            dir="ltr"
                            className="mt-2 break-words text-3xl font-black tracking-tight text-[#1F2B5E] sm:text-4xl"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            {modelLabel}
                          </h2>
                          <div className="mt-1 text-base font-black text-[#555b73]">{arabicLabel}</div>
                        </div>
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#B1785C]/20 bg-white text-[#6366F1] shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transform-none">
                          <Icon size={25} />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-[#ebe6e1] bg-white p-3">
                          <div className="text-lg font-black text-[#1F2B5E]">20</div>
                          <div className="mt-1 text-[10px] font-bold text-[#7b8091]">Grammar & Vocab</div>
                        </div>
                        <div className="rounded-xl border border-[#ebe6e1] bg-white p-3">
                          <div className="text-lg font-black text-[#1F2B5E]">8</div>
                          <div className="mt-1 text-[10px] font-bold text-[#7b8091]">Reading</div>
                        </div>
                        <div className="rounded-xl border border-[#ebe6e1] bg-white p-3">
                          <div className="text-lg font-black text-[#1F2B5E]">1</div>
                          <div className="mt-1 text-[10px] font-bold text-[#7b8091]">Writing</div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-black">
                          <span className="text-[#73788d]">تقدم النموذج</span>
                          <span className="text-[#6366F1]">{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e9e7ec]">
                          <div
                            className="h-full rounded-full bg-[#6366F1] transition-all duration-300"
                            style={{ width: progress + "%" }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-black">
                        <span className="rounded-full bg-[#eef0f7] px-3 py-1.5 text-[#1F2B5E]">{stateLabel}</span>
                        <span className="rounded-full bg-[#f8efe9] px-3 py-1.5 text-[#9a6147]">محاولات مفتوحة ∞</span>
                        {bestResult ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                            أفضل نتيجة {bestResult.percentage}%
                          </span>
                        ) : null}
                      </div>

                      {canEnter ? (
                        <a
                          href={"/exam/" + exam.id}
                          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2B5E] px-4 font-black text-white shadow-[0_12px_28px_rgba(31,43,94,.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(31,43,94,.25)] motion-reduce:transform-none"
                        >
                          استعراض النموذج <PlayCircle size={18} />
                        </a>
                      ) : (
                        <div className="mt-5 rounded-xl border border-[#e1dde7] bg-white p-3 text-center text-xs font-black text-[#888c9e]">
                          النموذج غير متاح حالياً.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
          ) : (
            (["Grammar", "Vocabulary", "Reading"] as const).map((name) => {
              const section =
                courseSections.find((item) => item.title.toLowerCase() === name.toLowerCase()) ??
                null;
              const exam = section
                ? exams.find((item) => item.id === section.exam_id) ?? primaryExam
                : primaryExam;

              if (!exam || !section) {
                return (
                  <article key={name} className="rounded-[1.6rem] border border-dashed border-[#d9d4e2] bg-white p-5 text-center">
                    <div className="text-lg font-black">{name}</div>
                    <div className="mt-2 text-xs text-[#85899a]">لا يوجد Section منشور لهذا القسم حاليا.</div>
                  </article>
                );
              }

              const attempts = data.attempts.filter((item) => item.exam_id === exam.id);
              const results = data.results.filter((item) => item.exam_id === exam.id);
              const bestResult = [...results]
                .filter((item) => item.percentage !== null)
                .sort((a,b)=>Number(b.percentage ?? 0)-Number(a.percentage ?? 0))[0];
              const activeAttempt = attempts.find((item) => item.status === "IN_PROGRESS") ?? attempts[0];
              const sectionProgress = activeAttempt?.section_progress?.[section.id] ?? {};
              const usedSectionAttempts = Number(sectionProgress.attempt_count ?? 0);
              const remaining = Math.max(0, exam.attempts_allowed - usedSectionAttempts);
              const bestSectionPercentage = sectionProgress.best_percentage;
              const inProgress = attempts.find((item) => item.status === "IN_PROGRESS");
              const finalized = attempts.some((item) => item.status === "GRADED" || item.status === "SUBMITTED");
              const now = Date.now();
              const isOpen = now >= new Date(exam.starts_at).getTime() && now <= new Date(exam.ends_at).getTime();

              return (
                <article key={section.id} className="numo-card-lift numo-metal-border overflow-hidden rounded-[1.7rem] border border-[#e3dfe8] bg-white shadow-[0_14px_38px_rgba(31,43,94,.07)]">
                  <div className="h-2" style={{ background: visual.accent }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#B1785C]">{exam.category}</div>
                        <h2 dir="ltr" className="mt-1 break-words text-2xl font-black">{name}</h2>
                      </div>
                      <div className="numo-icon-medallion grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: visual.accentSoft, color: visual.accent }}>
                        <BookOpenCheck size={20} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <div className="flex items-center gap-1 font-black"><Clock3 size={14} /> {section.time_limit_minutes ?? 30} دقيقة</div>
                        <div className="mt-1 text-[#868a9b]">{section.question_count ?? 0} سؤال</div>
                      </div>
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <div dir="ltr" className="font-black">{remaining} / {exam.attempts_allowed}</div>
                        <div className="mt-1 text-[#868a9b]">محاولات متبقية</div>
                      </div>
                    </div>

                    {bestSectionPercentage !== undefined ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-700"><Award size={14} /> أفضل درجة لهذا القسم</span>
                          <span className="text-xl font-black text-emerald-800">{Number(bestSectionPercentage).toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : bestResult ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-700"><Award size={14} /> النتيجة النهائية</span>
                          <span className="text-xl font-black text-emerald-800">{bestResult.percentage}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-[#e9e5ed] bg-[#faf9fb] p-3 text-xs leading-6 text-[#777c8f]">
                        النتيجة تظهر مباشرة مع مراجعة الأسئلة الخاطئة.
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                      <span className="rounded-full bg-[#f2f1ff] px-2.5 py-1 text-[#5559ca]">{exam.attempts_allowed} محاولات</span>
                      <span className="rounded-full bg-[#fbf2ed] px-2.5 py-1 text-[#956047]">نتيجة مباشرة</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">اختيار حر</span>
                    </div>

                    {finalized ? (
                      <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                        <Award size={17} /> عرض النتيجة النهائية
                      </a>
                    ) : isOpen && (remaining > 0 || inProgress) ? (
                      <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                        {usedSectionAttempts > 0 ? <RotateCcw size={17} /> : <PlayCircle size={17} />}
                        {usedSectionAttempts > 0 ? "عرض النتيجة / إعادة المحاولة" : "اختيار هذا Section"}
                      </a>
                    ) : (
                      <div className="mt-4 rounded-xl bg-[#f0eff4] px-4 py-3 text-center text-xs font-black text-[#7b8092]">
                        {!isOpen ? "القسم غير متاح حاليا" : "تم استخدام جميع المحاولات"}
                      </div>
                    )}

                    {results.length ? (
                      <a href={"/results/" + exam.id} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-3 text-xs font-black">
                        <History size={15} /> سجل النتائج
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[1.6rem] border border-[#e3dfe8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={19} />
              <h2 className="text-lg font-black">طريقة الاختبار</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(isGeneralCourse
                ? [
                    ["1", "اختر الاختبار", "Quiz 1 أو Quiz 2 أو Midterm"],
                    ["2", "ابدأ من الأيقونة", "عدد المحاولات يظهر لكل اختبار حسب إعداده الفعلي"],
                    ["3", "راجع نتيجتك", "الدرجة والمراجعة تظهران مباشرة"],
                  ]
                : [
                    ["1", "اختر القسم", isEl097Quiz2 ? "اختر من الأقسام السبعة المعتمدة في الملف" : "Grammar أو Vocabulary أو Reading"],
                    ["2", "أكمل الأسئلة", isEl097Quiz2 ? "30 دقيقة لكل قسم؛ Writing اختر موضوعاً من سبعة" : "الوقت يبدأ عند دخول المحاولة"],
                    ["3", "راجع نتيجتك", "الدرجة والأخطاء تظهر مباشرة بعد التسليم"],
                  ]
              ).map(([n,title,note]) => (
                <div key={n} className="rounded-2xl bg-[#f8f7fa] p-4">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1F2B5E] text-xs font-black text-white">{n}</div>
                  <div className="mt-3 font-black">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-[#85899a]">{note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-[#e3dfe8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#6366F1]" size={19} />
              <h2 className="text-lg font-black">حماية الحساب</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#73788d]">
              حسابك مرتبط بجهاز واحد موثوق. إذا احتجت إلى تغيير الجهاز فتواصل مع الإدارة لإعادة ضبط الجهاز.
            </p>
            <div className="mt-4 text-xs font-black text-[#B1785C]">{formatDate(new Date().toISOString())}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
