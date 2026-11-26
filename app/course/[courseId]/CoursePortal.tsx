"use client";

import { useEffect, useMemo, useState } from "react";
import WritingLab from "./WritingLab";
import { NumoExamCard } from "@/app/components/NumoExamCard";
import { SpellCheck, BookA, BookOpen, PenTool, ArrowUpRight } from "lucide-react";
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
import { intensiveFetch } from "@/lib/intensive/client";
import StudentBackNavigation from "@/app/components/StudentBackNavigation";
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
  // Only foundation intensive levels use the 3-stage academic assessment journey.
  // EL111 and EL112 retain their current, independent assessment structure.
  const [foundationExplore, setFoundationExplore] = useState(false);
  const [writingOpen, setWritingOpen] = useState(false);
  const [el112Stage, setEl112Stage] = useState<"MIDTERM" | "FINAL" | null>(null);
  const [intensiveStage, setIntensiveStage] = useState<"QUIZ 1" | "QUIZ 2" | "FINAL">("QUIZ 2");

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
        const stage = new URLSearchParams(window.location.search).get("stage");
        if (stage === "QUIZ 1" || stage === "QUIZ 2" || stage === "FINAL") { setIntensiveStage(stage); setFoundationExplore(true); }
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
  const displayCourseCode = normalizedCourseCode === "TU170_GT101" ? "TU170 / GT101" : course.code;
  const isEl112 = normalizedCourseCode === "EL112";
  const isGeneralCourse =
    normalizedCourseCode.startsWith("GR") ||
    normalizedCourseCode.startsWith("AR") ||
    normalizedCourseCode === "GT103" ||
    normalizedCourseCode === "TU170_GT101";
  const isEl098Quiz2 = normalizedCourseCode === "EL098";
  const isEl099Quiz2 = normalizedCourseCode === "EL099";
  const isEl097Quiz2 = normalizedCourseCode === "EL097_EL099E";
  const isFoundationThreeStage = isEl097Quiz2 || isEl098Quiz2 || isEl099Quiz2;
  const quiz2Exams = isFoundationThreeStage ? exams.filter((exam) => exam.category === "QUIZ 2") : [];
  const quiz2Sections = isFoundationThreeStage
    ? courseSections.filter((section) => quiz2Exams.some((exam) => exam.id === section.exam_id))
    : [];
  const quiz2PrimaryExam = quiz2Exams.find((exam) => quiz2Sections.filter((section) => section.exam_id === exam.id).length > 1) ?? quiz2Exams[0] ?? null;
  const selectedStageExams = isFoundationThreeStage
    ? exams.filter((exam) => exam.category === intensiveStage)
    : [];
  const intensiveStageDefinitions = [
    { category: "QUIZ 1", title: "Quiz 1", titleAr: "التقييم الأول", number: "01", Icon: ClipboardCheck, color: "#6366F1", soft: "#F1F1FF" },
    { category: "QUIZ 2", title: "Quiz 2 (MIDTERM)", titleAr: "التقييم النصفي", number: "02", Icon: BookOpenCheck, color: "#B1785C", soft: "#FBF2ED" },
    { category: "FINAL", title: "Final", titleAr: "الاختبار النهائي", number: "03", Icon: GraduationCap, color: "#1F2B5E", soft: "#EEF0F7" },
  ] as const;
  const el098ModelIcons = [ClipboardCheck, FileCheck2, GraduationCap, BookOpenCheck] as const;
  const generalExamDefinitions = [
    {
      category: "QUIZ 1",
      title: "تجميعات Quiz 1",
      subtitle: "تدريب هادئ يهيئك للانطلاقة",
      number: "01",
      duration: 30,
      Icon: ClipboardCheck,
      accent: "#6366F1",
      soft: "#F0F0FF",
    },
    {
      category: "QUIZ 2",
      title: "تجميعات Quiz 2",
      subtitle: "تثبيت المفاهيم بخطوات قصيرة",
      number: "02",
      duration: 30,
      Icon: FileCheck2,
      accent: "#B1785C",
      soft: "#FBF2ED",
    },
    {
      category: "MIDTERM",
      title: "تجميعات Midterm",
      subtitle: "مراجعة مركزة قبل منتصف الفصل",
      number: "03",
      duration: 60,
      Icon: GraduationCap,
      accent: "#1F2B5E",
      soft: "#EEF0F7",
    },
    {
      category: "FINAL",
      title: "تجميعات Final",
      subtitle: "استعداد شامل بثقة ووضوح",
      number: "04",
      duration: 60,
      Icon: FileCheck2,
      accent: "#6366F1",
      soft: "#F1F1FF",
    },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="sticky top-0 z-40 mb-5">
          <StudentBackNavigation
            backHref="/"
            backLabel="العودة إلى مقرراتي"
            context={displayCourseCode}
          />
        </div>

        <section className="numo-premium-surface numo-metal-border overflow-hidden rounded-[1.8rem] sm:rounded-[2rem]">
          <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)] lg:items-stretch">
            <div className="relative flex items-center justify-center overflow-hidden bg-white p-2 sm:p-3 lg:p-4">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] border border-[#ece9ef] bg-white sm:rounded-[1.5rem]">
                <img
                  src={cover}
                  alt={"غلاف " + displayCourseCode}
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
                  {displayCourseCode}
                </div>
                <h1 dir="auto" className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">
                  {course.title}
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {isGeneralCourse
                    ? "اختر تجميعات Quiz 1 أو Quiz 2 أو MIDTERM أو FINAL. لكل اختبار محاولات مفتوحة، وتظهر النتيجة مباشرة بعد التسليم."
                    : isFoundationThreeStage
                      ? "مراحل البرنامج المكثف الثلاث: Quiz 1، ثم Quiz 2 (MIDTERM)، ثم Final. اختر المرحلة لعرض اختباراتك. محتوى الكويز الثاني الموجود محفوظ بأقسامه ونماذجه ومحاولاته، أما المراحل الأخرى فتُفعّل عند إضافة أسئلتها المعتمدة."
                    : isEl098Quiz2
                      ? "QUIZ 2 — أربعة نماذج تدريبية مستقلة. اختر أي نموذج ثم أي قسم: Grammar & Vocabulary أو Reading أو Writing. التصحيح الموضوعي فوري والمحاولات مفتوحة."
                      : isEl097Quiz2
                        ? "EL097 — QUIZ 2 | سبعة أقسام بالترتيب الأصلي للملف: Grammar Foundations، Verbs & Prepositions، Vocabulary & Definitions، ثلاث قطع Reading مستقلة، ثم Writing بسبعة موضوعات. راجع الإجابات بعد تسليم كل قسم."
                        : isEl099Quiz2
                          ? "EL099 — QUIZ 2 | ثلاثة أقسام مستقلة: Grammar and Vocabulary (166 سؤالًا)، Reading (Passages) (44 سؤالًا من سبع قطع)، وWriting (موضوع واحد من ستة، 150 كلمة على الأقل). جميع الأسئلة متاحة والمحاولات غير محدودة."
                          : "اختر Grammar أو Vocabulary أو Reading. كل قسم مستقل وله وقته ومحاولاته، وتظهر نتيجتك مباشرة بعد التسليم."}
                </p>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-3 text-center">
                  <div className="text-xl font-black sm:text-2xl">
                    {isGeneralCourse ? generalExamDefinitions.length : isFoundationThreeStage ? 3 : (sectionCount || exams.length)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-white/55">
                    {isGeneralCourse || isFoundationThreeStage ? "مراحل التقييم" : "الأقسام"}
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

        {isFoundationThreeStage && (!isEl099Quiz2 || !foundationExplore) ? (
          <section aria-label="مراحل اختبارات الدورة المكثفة" className="mt-6">
            <div className="mb-4 text-right">
              <h2 className="text-xl font-black text-[#1F2B5E] sm:text-2xl">الاختبارات الأساسية للدورة المكثفة</h2>
              <p className="mt-1 text-sm font-semibold leading-7 text-[#73788d]">
                ثلاث مراحل مستقلة لكل مقرر. افتح Quiz 2 (MIDTERM) لمتابعة النماذج والأقسام الحالية، دون دمجها مع Quiz 1 أو Final.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {intensiveStageDefinitions.map((definition) => {
                const stageExams = exams.filter((exam) => exam.category === definition.category);
                const now = Date.now();
                const activeExams = stageExams.filter((exam) =>
                  exam.status === "LIVE" &&
                  now >= new Date(exam.starts_at).getTime() &&
                  now <= new Date(exam.ends_at).getTime()
                );
                const selected = intensiveStage === definition.category;
                const Icon = definition.Icon;
                return (
<NumoExamCard key={definition.category} number={definition.number} title={definition.title} course={isEl099Quiz2?"EL099 / LEVEL 3":displayCourseCode} meta={courseSections.filter(section=>stageExams.some(exam=>exam.id===section.exam_id)).map(section=>"• "+section.title).join("  |  ")+"\n"+courseSections.filter(section=>stageExams.some(exam=>exam.id===section.exam_id)).length+" SECTIONS"} selected={selected} locked={!activeExams.length} onSelect={()=>{setIntensiveStage(definition.category);setFoundationExplore(true);window.scrollTo(0,0)}} />
                );
              })}
            </div>
          </section>
        ) : null}

        {isEl099Quiz2 && foundationExplore && <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={()=>setFoundationExplore(false)} className="rounded-xl border border-[#B1785C] bg-white px-4 py-3 font-bold">العودة للاختبارات</button><h2 dir="ltr" className="text-xl font-black">{intensiveStage} · SECTIONS</h2></div>}
        {isEl099Quiz2 && !foundationExplore ? null : isEl112 ? (
          <section className="mt-6" aria-label="EL112 exam stages">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["MIDTERM", "FINAL"] as const).map((stage, i) => (
                <NumoExamCard key={stage} number={String(i+1).padStart(2,"0")} title={stage+" EXAM"} course={displayCourseCode+" / LEVEL 5"} selected={el112Stage===stage} meta={courseSections.filter(section=>exams.some(exam=>exam.id===section.exam_id&&(exam.category===stage||(stage==="MIDTERM"&&exam.category==="QUIZ 2")))).length+" SECTIONS"} onSelect={()=>{setEl112Stage(stage);setWritingOpen(false)}} />
              ))}
            </div>
            {el112Stage && !writingOpen && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" dir="rtl" aria-live="polite">
              {(["Grammar","Vocabulary","Reading","Writing"] as const).map((name,i)=>{
                const Icon=[SpellCheck,BookA,BookOpen,PenTool][i];
                const stageExams=exams.filter(e=>e.category.trim().toUpperCase()===el112Stage||(el112Stage==="MIDTERM"&&e.category.trim().toUpperCase()==="QUIZ 2"));
                const matches=courseSections.filter(s=>stageExams.some(e=>e.id===s.exam_id)&&s.title.trim().toLowerCase()===name.toLowerCase());
                const lab=name==="Writing"&&el112Stage==="FINAL";
                return <NumoExamCard key={name} number={String(i+1).padStart(2,"0")} title={name} course={displayCourseCode+" · "+el112Stage} meta={["Grammar Mastery","Word Mastery","Reading Skills","Academic Writing Lab"][i]} onSelect={lab?()=>setWritingOpen(true):undefined} href={!lab&&matches.length===1&&stageExams.some(e=>e.id===matches[0].exam_id&&e.status==="LIVE"&&Date.now()>=new Date(e.starts_at).getTime()&&Date.now()<=new Date(e.ends_at).getTime())?"/exam/"+matches[0].exam_id+"?section="+matches[0].id:undefined} cta="Start Practice">{!lab&&matches.map(section=><div key={section.id} className="text-sm">{section.question_count??0} سؤال · {section.time_limit_minutes} دقيقة{matches.length>1&&stageExams.some(e=>e.id===section.exam_id&&e.status==="LIVE"&&Date.now()>=new Date(e.starts_at).getTime()&&Date.now()<=new Date(e.ends_at).getTime())&&<a className="block underline" href={"/exam/"+section.exam_id+"?section="+section.id}>Start Practice</a>}</div>)}</NumoExamCard>
              })}
            </div>}
            {el112Stage==="FINAL"&&writingOpen&&<WritingLab onBack={()=>setWritingOpen(false)}/>}

          </section>
        ) : isEl099Quiz2 && intensiveStage === "QUIZ 1" ? (
          <section className="mt-7 grid gap-5 sm:grid-cols-3" aria-live="polite">
            {(["Grammar","Vocabulary","Reading"] as const).map((name,i)=>{
              const Icon=[SpellCheck,BookA,BookOpen][i];
              const matches=courseSections.filter(section=>selectedStageExams.some(exam=>exam.id===section.exam_id)&&section.title.trim().toLowerCase()===name.toLowerCase());
              return <NumoExamCard key={name} number={String(i+1).padStart(2,"0")} title={name} course={displayCourseCode+" · QUIZ 1"} meta={["Grammar Mastery","Word Mastery","Reading Skills"][i]} href={matches.length===1&&selectedStageExams.some(e=>e.id===matches[0].exam_id&&e.status==="LIVE"&&Date.now()>=new Date(e.starts_at).getTime()&&Date.now()<=new Date(e.ends_at).getTime())?"/exam/"+matches[0].exam_id+"?section="+matches[0].id:undefined} cta="Start Practice">{matches.map(section=><div key={section.id} className="text-sm">{section.question_count??0} سؤال · {section.time_limit_minutes} دقيقة{matches.length>1&&selectedStageExams.some(e=>e.id===section.exam_id&&e.status==="LIVE"&&Date.now()>=new Date(e.starts_at).getTime()&&Date.now()<=new Date(e.ends_at).getTime())&&<a className="block underline" href={"/exam/"+section.exam_id+"?section="+section.id}>Start Practice</a>}</div>)}</NumoExamCard>
            })}
          </section>
        ) : isFoundationThreeStage && intensiveStage !== "QUIZ 2" ? (
          <section aria-live="polite" className="mt-6 grid gap-4 md:grid-cols-2">
            {selectedStageExams.length ? (
              selectedStageExams.map((exam) => {
                const sectionList = courseSections.filter((section) => section.exam_id === exam.id);
                const questionCount = sectionList.reduce((sum, section) => sum + Number(section.question_count ?? 0), 0);
                const isOpen = exam.status === "LIVE" &&
                  Date.now() >= new Date(exam.starts_at).getTime() &&
                  Date.now() <= new Date(exam.ends_at).getTime();
                const attempts = data.attempts.filter((attempt) => attempt.exam_id === exam.id);
                const available = isOpen && questionCount > 0;
                return (
                  <NumoExamCard key={exam.id} number={String(selectedStageExams.indexOf(exam)+1).padStart(2,"0")} title={exam.title} course={displayCourseCode+" · "+intensiveStage} meta={questionCount+" سؤال · "+exam.duration_minutes+" دقيقة"} locked={!available} href={"/exam/"+exam.id} cta={attempts.length?"فتح الاختبار / إعادة المحاولة":"بدء الاختبار"} />
                );
              })
            ) : (
              <div role="status" className="col-span-full rounded-[1.6rem] border border-dashed border-[#d9d5e2] bg-white px-5 py-10 text-center">
                <BookOpenCheck className="mx-auto text-[#B1785C]" size={34} />
                <h3 className="mt-3 text-xl font-black text-[#1F2B5E]">
                  {intensiveStage === "QUIZ 1" ? "Quiz 1 — التقييم الأول" : "Final — الاختبار النهائي"}
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-8 text-[#7b8090]">
                  لم تُضف لهذا القسم أسئلة أو نماذج معتمدة بعد. سيظهر الاختبار هنا بعد إضافته ونشره من الإدارة، دون التأثير على Quiz 2 (MIDTERM) الحالي.
                </p>
              </div>
            )}
          </section>
        ) : (
        <section className={"mt-6 grid gap-4 " + (isEl098Quiz2 ? "md:grid-cols-2" : isGeneralCourse ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
          {isFoundationThreeStage ? (
            <div className="md:col-span-full rounded-[1.3rem] border border-[#e2dce5] bg-white px-5 py-4">
              <div dir="ltr" className="text-xs font-black tracking-[.2em] text-[#B1785C]">02 / 03 — QUIZ 2 (MIDTERM)</div>
              <h2 className="mt-1 text-xl font-black text-[#1F2B5E]">التقييم النصفي · اختبارات Quiz 2 الحالية</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#72788d]">
                {isEl098Quiz2
                  ? "أربعة نماذج، وكل نموذج يحتفظ بأقسام Grammar and Vocabulary وReading وWriting مستقلة."
                  : isEl099Quiz2
                    ? "ثلاثة أقسام: Grammar and Vocabulary، Reading (Passages)، ثم Writing."
                    : "سبعة أقسام تدريبية متتالية كما في ملف الكويز الثاني، مع إمكانية إعادة المحاولة دون حد."}
              </p>
            </div>
          ) : null}
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
              const availabilityLabel = canEnter
                ? "جاهز للبدء"
                : !exam || !hasQuestions
                  ? "قيد الإعداد"
                  : !isOpen
                    ? "غير متاح الآن"
                    : "اكتملت المحاولات";

              return (
                <NumoExamCard key={definition.category} number={definition.number} title={definition.title} course={displayCourseCode} meta={questionCount+" سؤال · "+(exam?.duration_minutes??definition.duration)+" دقيقة"} locked={!canEnter} href={exam?"/exam/"+exam.id:undefined} cta={usedAttempts>0?"إعادة المحاولة":"دخول الاختبار"} secondary={exam&&results.length?<a href={"/results/"+exam.id} className="text-sm font-bold text-white underline">سجل النتائج</a>:null}><div className="text-sm leading-7">{availabilityLabel} · {unlimitedAttempts?"محاولات غير محدودة":remaining+" محاولات متبقية"}{bestResult&&<p>أفضل درجة: {bestResult.percentage}%</p>}</div></NumoExamCard>
              );
            })
          ) : (isEl097Quiz2 || isEl099Quiz2) ? (
            quiz2Sections.map((section) => {
              const exam = quiz2Exams.find((item) => item.id === section.exam_id) ?? quiz2PrimaryExam;
              const attempts = exam ? data.attempts.filter((item) => item.exam_id === exam.id) : [];
              const latest = [...attempts].sort((a, b) => b.attempt_number - a.attempt_number)[0];
              const progress = latest?.section_progress?.[section.id];
              const done = Boolean(progress?.completed_at);
              const isOpen = Boolean(
                exam &&
                Date.now() >= new Date(exam.starts_at).getTime() &&
                Date.now() <= new Date(exam.ends_at).getTime()
              );
              const explanations: Record<number, string> = isEl099Quiz2
                ? {
                    1: "166 original Grammar and Vocabulary questions",
                    2: "Seven complete reading passages and 44 comprehension questions",
                    3: "Choose ONE of six Writing topics; minimum 150 words"
                  }
                : {
                    1: "Pronouns, possessives & articles",
                    2: "Verb forms and preposition choices",
                    3: "Words, definitions & usage",
                    4: "Reading Comprehension · Passage 01",
                    5: "Reading Comprehension · Passage 02",
                    6: "Reading Comprehension · Passage 03",
                    7: "Choose ONE topic from the seven Writing prompts"
                  };
              const Icon = isEl099Quiz2
                ? (section.position === 1 ? ClipboardCheck : section.position === 2 ? GraduationCap : FileCheck2)
                : section.position <= 2 ? ClipboardCheck
                : section.position === 3 ? BookOpenCheck
                : section.position <= 6 ? GraduationCap : FileCheck2;
              return (
                <NumoExamCard key={section.id} number={String(section.position).padStart(2,"0")} title={section.title} course={displayCourseCode+" · QUIZ 2"} meta={explanations[section.position]} locked={!exam||!isOpen} href={exam?"/exam/"+exam.id+(isEl099Quiz2?"?section="+section.id:""):undefined} cta={isEl099Quiz2?"Start Practice":"فتح الاختبار واختيار القسم"}><p className="text-sm">{section.question_count??0} سؤال · {section.time_limit_minutes} دقيقة · {done?"مكتمل":"جاهز للتدريب"}</p>{progress?.best_percentage!==undefined&&<p>أفضل نتيجة {Number(progress.best_percentage).toFixed(0)}%</p>}</NumoExamCard>
              );
            })
          ) : isEl098Quiz2 ? (
            [...quiz2Exams]
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
                  <NumoExamCard key={exam.id} number={String(modelIndex+1).padStart(2,"0")} title={modelLabel} course={displayCourseCode+" · QUIZ 2"} meta={arabicLabel+" · "+questionCount+" questions"} locked={!canEnter} href={"/exam/"+exam.id} cta="استعراض النموذج"><p className="text-sm">{stateLabel} · {progress}% · محاولات مفتوحة ∞</p>{bestResult&&<p>أفضل نتيجة {bestResult.percentage}%</p>}</NumoExamCard>
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
              const unlimitedAttempts = exam.attempts_allowed === 0;
              const remaining = unlimitedAttempts ? -1 : Math.max(0, exam.attempts_allowed - usedSectionAttempts);
              const bestSectionPercentage = sectionProgress.best_percentage;
              const inProgress = attempts.find((item) => item.status === "IN_PROGRESS");
              const finalized = attempts.some((item) => item.status === "GRADED" || item.status === "SUBMITTED");
              const now = Date.now();
              const isOpen = now >= new Date(exam.starts_at).getTime() && now <= new Date(exam.ends_at).getTime();

              return (
                <article key={section.id} className="numo-metal-border overflow-hidden rounded-[1.7rem] border border-[#e3dfe8] bg-white shadow-[0_14px_38px_rgba(31,43,94,.07)]">
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
                        <div dir={unlimitedAttempts ? "rtl" : "ltr"} className="font-black">{unlimitedAttempts ? "∞ غير محدودة" : `${remaining} / ${exam.attempts_allowed}`}</div>
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
                      <span className="rounded-full bg-[#f2f1ff] px-2.5 py-1 text-[#5559ca]">{unlimitedAttempts ? "محاولات غير محدودة" : `${exam.attempts_allowed} محاولات`}</span>
                      <span className="rounded-full bg-[#fbf2ed] px-2.5 py-1 text-[#956047]">نتيجة مباشرة</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">اختيار حر</span>
                    </div>

                    {finalized && !unlimitedAttempts ? (
                      <a href={"/results/" + exam.id} className="btn mt-4 w-full">
                        <Award size={17} /> عرض النتيجة النهائية
                      </a>
                    ) : isOpen && (unlimitedAttempts || remaining > 0 || inProgress) ? (
                      <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                        {usedSectionAttempts > 0 ? <RotateCcw size={17} /> : <PlayCircle size={17} />}
                        {finalized ? "إعادة الاختبار" : usedSectionAttempts > 0 ? "عرض النتيجة / إعادة المحاولة" : "اختيار هذا Section"}
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
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[1.6rem] border border-[#e3dfe8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={19} />
              <h2 className="text-lg font-black">طريقة الاختبار</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(isGeneralCourse
                ? [
                    ["1", "اختر الاختبار", "Quiz 1 أو Quiz 2 أو MIDTERM أو FINAL"],
                    ["2", "ابدأ من الأيقونة", "عدد المحاولات يظهر لكل اختبار حسب إعداده الفعلي"],
                    ["3", "راجع نتيجتك", "الدرجة والمراجعة تظهران مباشرة"],
                  ]
                : isFoundationThreeStage
                  ? [
                      ["1", "اختر مرحلة التقييم", "Quiz 1 أو Quiz 2 (MIDTERM) أو Final"],
                      ["2", "افتح الاختبار المتاح", "داخل Quiz 2 اختر النموذج أو القسم المناسب ثم ابدأ التدريب"],
                      ["3", "راجع نتيجتك وأعد المحاولة", "التصحيح فوري للأسئلة الموضوعية والمحاولات غير محدودة"],
                    ]
                : [
                    ["1", "اختر القسم", isEl099Quiz2 ? "Grammar and Vocabulary أو Reading (Passages) أو Writing" : isEl097Quiz2 ? "اختر من الأقسام السبعة المعتمدة في الملف" : "Grammar أو Vocabulary أو Reading"],
                    ["2", "أكمل الأسئلة", isEl099Quiz2 ? "120 دقيقة للقواعد، و60 للقراءة، و45 للكتابة؛ اختر موضوعًا من ستة" : isEl097Quiz2 ? "30 دقيقة لكل قسم؛ Writing اختر موضوعاً من سبعة" : "الوقت يبدأ عند دخول المحاولة"],
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

