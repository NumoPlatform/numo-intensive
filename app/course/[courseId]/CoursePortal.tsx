"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  History,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
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

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#6f7488]">
            <ArrowRight size={17} /> العودة للرئيسية
          </a>
          <NumoBrand horizontal className="w-auto" />
        </div>

        <section
          className="relative overflow-hidden rounded-[1.7rem] shadow-[0_25px_70px_rgba(31,43,94,.20)] sm:rounded-[2rem]"
          style={{ background: visual.gradient }}
        >
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 hidden h-full w-full object-cover object-center opacity-55 sm:block"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#1F2B5E]/96 via-[#1F2B5E]/83 to-[#1F2B5E]/44" />
          <div className="relative grid gap-6 p-5 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-[#f1c7b1]">{visual.level}</span>
              <div dir="ltr" className="mt-4 text-sm font-black tracking-[.15em] text-white/65">{course.code}</div>
              <h1 dir="ltr" className="mt-1 break-words text-3xl font-black leading-tight sm:text-4xl">{course.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-white/74">
                اختر Grammar أو Vocabulary أو Reading. كل قسم مستقل وله 30 دقيقة و4 محاولات، وتظهر نتيجتك مباشرة بعد التسليم.
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[270px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
                <div className="text-2xl font-black">{sectionCount || exams.length}</div>
                <div className="text-[11px] text-white/60">الأقسام</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
                <div className="text-2xl font-black">{completed}</div>
                <div className="text-[11px] text-white/60">المكتمل</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
                <div className="text-2xl font-black">{best?.percentage ?? "—"}{best ? "%" : ""}</div>
                <div className="text-[11px] text-white/60">أفضل درجة</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {(["Grammar", "Vocabulary", "Reading"] as const).map((name) => {
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
            const inProgress = attempts.find((item) => item.status === "IN_PROGRESS");
            const usedAttempts = Math.max(
              0,
              ...attempts.map((item) => Number(item.attempt_number || 0)),
            );
            const remaining = Math.max(0, exam.attempts_allowed - usedAttempts);
            const now = Date.now();
            const isOpen = now >= new Date(exam.starts_at).getTime() && now <= new Date(exam.ends_at).getTime();

            return (
              <article key={section.id} className="overflow-hidden rounded-[1.7rem] border border-[#e3dfe8] bg-white shadow-[0_14px_38px_rgba(31,43,94,.07)]">
                <div className="h-2" style={{ background: visual.accent }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#B1785C]">{exam.category}</div>
                      <h2 dir="ltr" className="mt-1 break-words text-2xl font-black">{name}</h2>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: visual.accentSoft, color: visual.accent }}>
                      <BookOpenCheck size={20} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#f8f7fa] p-3">
                      <div className="flex items-center gap-1 font-black"><Clock3 size={14} /> {section.time_limit_minutes ?? 30} دقيقة</div>
                      <div className="mt-1 text-[#868a9b]">{section.question_count ?? 0} سؤال</div>
                    </div>
                    <div className="rounded-xl bg-[#f8f7fa] p-3">
                      <div className="font-black">{remaining} / {exam.attempts_allowed}</div>
                      <div className="mt-1 text-[#868a9b]">محاولات متبقية</div>
                    </div>
                  </div>

                  {bestResult ? (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-black text-emerald-700"><Award size={14} /> أفضل درجة</span>
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

                  {isOpen && (remaining > 0 || inProgress) ? (
                    <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                      {inProgress ? <PlayCircle size={17} /> : attempts.length ? <RotateCcw size={17} /> : <PlayCircle size={17} />}
                      {inProgress ? "متابعة واختيار Section" : attempts.length ? "بدء محاولة جديدة" : "اختيار هذا Section"}
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
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[1.6rem] border border-[#e3dfe8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={19} />
              <h2 className="text-lg font-black">طريقة الاختبار</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "اختر القسم", "Grammar أو Vocabulary أو Reading"],
                ["2", "أكمل الأسئلة", "الوقت يبدأ عند دخول المحاولة"],
                ["3", "راجع نتيجتك", "الدرجة والأخطاء تظهر مباشرة"],
              ].map(([n,title,note]) => (
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
