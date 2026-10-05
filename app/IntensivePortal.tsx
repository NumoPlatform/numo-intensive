"use client";

import type { FormEvent } from "react";
import NumoBrand from "@/app/components/NumoBrand";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LockKeyhole,
  LogOut,
  Medal,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

type Dashboard = {
  profile: {
    full_name: string;
    username: string;
    role: "ADMIN" | "STUDENT";
  };
  courses: Array<{
    id: string;
    code: string;
    title: string;
    description: string | null;
    default_cover_url: string | null;
    cover_path: string | null;
  }>;
  exams: Array<{
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
  }>;
  sections: Array<{
    id: string;
    exam_id: string;
    title: string;
    position: number;
    time_limit_minutes: number;
    question_count: number | null;
    marks: number;
  }>;
  attempts: Array<{
    id: string;
    exam_id: string;
    attempt_number: number;
    status: string;
    started_at: string;
    expires_at: string;
    submitted_at: string | null;
    section_progress: Record<string, {
      attempt_count?: number;
      best_percentage?: number;
      completed_at?: string | null;
    }>;
  }>;
  results: Array<{
    attempt_id: string;
    exam_id: string;
    final_score: number | null;
    total_marks: number;
    percentage: number | null;
    status: string | null;
    grading_status: string;
    is_published: boolean;
    published_at: string | null;
  }>;
  settings: {
    support_phone: string | null;
    support_whatsapp: string | null;
    support_website: string | null;
    support_email: string | null;
    timezone: string;
  } | null;
};

function getDeviceSecret() {
  const key = "numo-intensive-device-secret";
  let value = window.localStorage.getItem(key);
  if (!value) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(key, value);
  }
  return value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export default function IntensivePortal() {
  const [stage, setStage] = useState<"login" | "loading" | "portal">("loading");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });

  async function loadDashboard() {
    const response = await intensiveFetch("/api/dashboard", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "تعذر تحميل حسابك.");
    if (payload.profile?.role === "ADMIN") {
      window.location.replace("/admin");
      return;
    }
    setData(payload);
    setStage("portal");
  }

  useEffect(() => {
    loadDashboard().catch(() => setStage("login"));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setStage("loading");

    try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.message || "تعذر تسجيل الدخول.");
      setStage("login");
      return;
    }

    if (payload.role === "ADMIN") {
      window.location.replace("/admin");
      return;
    }

    const deviceResponse = await fetch("/api/device/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSecret: getDeviceSecret() }),
    });
    const devicePayload = await deviceResponse.json();

    if (!deviceResponse.ok) {
      setMessage(devicePayload.message || "هذا الجهاز غير مصرح له بالدخول إلى حسابك.");
      setStage("login");
      return;
    }

    await loadDashboard();
    } catch {
      setMessage("تعذر تسجيل الدخول. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.");
      setStage("login");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setData(null);
    setForm({ username: "", password: "" });
    setStage("login");
  }

  const examsByCourse = useMemo(() => {
    const map = new Map<string, Dashboard["exams"]>();
    for (const exam of data?.exams ?? []) {
      map.set(exam.course_id, [...(map.get(exam.course_id) ?? []), exam]);
    }
    return map;
  }, [data]);

  const nextAction = useMemo(() => {
    if (!data) return null;

  const now = Date.now();
  const openExams = data.exams.filter(
    (exam) =>
      now >= new Date(exam.starts_at).getTime() &&
      now <= new Date(exam.ends_at).getTime(),
  );

  const completedSectionIds = new Set<string>();
  const sectionBestScores = new Map<string, number>();

  for (const attempt of data.attempts) {
    for (const [sectionId, progress] of Object.entries(attempt.section_progress ?? {})) {
      if (progress.completed_at) completedSectionIds.add(sectionId);
      if (progress.best_percentage !== undefined) {
        const score = Number(progress.best_percentage ?? 0);
        sectionBestScores.set(
          sectionId,
          Math.max(score, sectionBestScores.get(sectionId) ?? 0),
        );
      }
    }
  }

  const bestPublishedResult = [...data.results]
    .filter((item) => item.percentage !== null)
    .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];

  const firstName = data.profile.full_name.trim().split(/\s+/)[0] || data.profile.full_name;
  const initials = data.profile.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  const totalSections = data.sections.length;
  const completedSections = completedSectionIds.size;
  const overallProgress = totalSections
    ? Math.round((completedSections / totalSections) * 100)
    : 0;

  function courseMetrics(courseId: string) {
    const exams = examsByCourse.get(courseId) ?? [];
    const examIds = new Set(exams.map((exam) => exam.id));
    const sections = data.sections.filter((section) => examIds.has(section.exam_id));
    const completed = sections.filter((section) => completedSectionIds.has(section.id)).length;
    const scores = sections
      .map((section) => sectionBestScores.get(section.id))
      .filter((score): score is number => score !== undefined);
    const best = scores.length
      ? Math.max(...scores)
      : Math.max(
          0,
          ...data.results
            .filter((result) => examIds.has(result.exam_id) && result.percentage !== null)
            .map((result) => Number(result.percentage ?? 0)),
        );
    const open = exams.filter(
      (exam) =>
        now >= new Date(exam.starts_at).getTime() &&
        now <= new Date(exam.ends_at).getTime(),
    ).length;

    return {
      exams,
      sections,
      completed,
      best,
      open,
      progress: sections.length ? Math.round((completed / sections.length) * 100) : 0,
    };
  }

  const recommendedCourse = nextAction
    ? data.courses.find((course) => course.id === nextAction.exam.course_id) ?? null
    : data.courses[0] ?? null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f9fc_0%,#f4f5f9_46%,#f7f5f3_100%)] text-[#1F2B5E]">
      <header className="sticky top-0 z-40 border-b border-[#e9e6ed]/90 bg-white/95 shadow-[0_8px_30px_rgba(31,43,94,.05)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <NumoBrand horizontal priority className="w-auto" />
            <div className="hidden h-9 w-px bg-[#e6e2e9] lg:block" />
            <div className="hidden lg:block">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#B1785C]" dir="ltr">
                NUMO INTENSIVE
              </div>
              <div className="mt-0.5 text-xs font-bold text-[#7b8092]">
                Student Academic Portal
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-2xl border border-[#e8e4eb] bg-[#faf9fb] p-1.5 xl:flex">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#1F2B5E] px-4 py-2.5 text-xs font-black text-white shadow-sm">
              <LayoutDashboard size={15} /> الرئيسية
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-[#6d7287]">
              <BookOpenCheck size={15} /> مقرراتي
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-[#6d7287]">
              <BarChart3 size={15} /> الأداء
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-[#e6e2e9] bg-white px-3 py-2 sm:flex">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1F2B5E] text-xs font-black text-white">
                {initials || "N"}
              </div>
              <div className="max-w-[150px] leading-tight">
                <div className="truncate text-xs font-black">{data.profile.full_name}</div>
                <div className="mt-1 truncate text-[10px] font-bold text-[#8b8f9f]" dir="ltr">
                  @{data.profile.username}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-[#e1dde5] bg-white text-[#1F2B5E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f8f7fa]"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1F2B5E] text-white shadow-[0_30px_90px_rgba(31,43,94,.22)] sm:rounded-[2.35rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(177,120,92,.24),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(99,102,241,.24),transparent_30%)]" />
          <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute -left-8 bottom-8 h-24 w-24 rounded-full border border-white/10" />

          <div className="relative grid gap-7 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.65fr)] lg:items-stretch lg:p-10">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-black text-[#efc5b1]">
                  <Sparkles size={14} /> Academic Dashboard · بوابة الطالب الأكاديمية
                </div>

                <h1 className="max-w-4xl text-3xl font-black leading-[1.35] sm:text-4xl lg:text-[3.2rem]">
                  أهلا <span className="text-[#d8a084]">{firstName}</span>،
                  <span className="block">واصل تقدمك بثقة وتركيز.</span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-8 text-white/68 sm:text-base">
                  كل مقرر، Section، نتيجة ومحاولة في تجربة واحدة منظمة. ابدأ من الخطوة التالية أو راجع أداءك ثم أكمل استعدادك.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-xs font-black">
                  <ShieldCheck size={15} className="text-emerald-300" /> جهاز موثوق
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-xs font-black">
                  <Layers3 size={15} className="text-[#e5b49b]" /> {totalSections} Sections
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-xs font-black">
                  <Target size={15} className="text-indigo-200" /> {openExams.length} Available Now
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.65rem] border border-white/12 bg-white/9 p-5 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-white/55">ACADEMIC PROGRESS</div>
                    <div className="mt-2 text-4xl font-black">{overallProgress}%</div>
                    <div className="mt-1 text-xs font-bold text-white/55">
                      {completedSections} of {totalSections || 0} sections completed
                    </div>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                    <BarChart3 size={23} className="text-[#efc3ad]" />
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#B1785C] to-[#e0ae94]"
                    style={{ width: overallProgress + "%" }}
                  />
                </div>
              </div>

              <div className="rounded-[1.65rem] border border-white/12 bg-white/9 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-white/55">BEST PERFORMANCE</div>
                    <div className="mt-2 text-3xl font-black">
                      {bestPublishedResult?.percentage ?? "—"}{bestPublishedResult ? "%" : ""}
                    </div>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#B1785C]">
                    <Trophy size={22} />
                  </div>
                </div>
                <div className="mt-4 text-xs font-bold leading-6 text-white/55">
                  أفضل نتيجة منشورة في اختباراتك حتى الآن.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: BookOpen,
              label: "المقررات المسجلة",
              value: data.courses.length,
              note: "Active courses",
              accent: "#B1785C",
              soft: "#fbf4f0",
            },
            {
              icon: Layers3,
              label: "إجمالي الأقسام",
              value: totalSections,
              note: "Grammar · Vocabulary · Reading",
              accent: "#6366F1",
              soft: "#f1f2ff",
            },
            {
              icon: CheckCircle2,
              label: "الأقسام المكتملة",
              value: completedSections,
              note: overallProgress + "% overall progress",
              accent: "#16875f",
              soft: "#eef9f4",
            },
            {
              icon: Medal,
              label: "أفضل نتيجة",
              value: bestPublishedResult ? (bestPublishedResult.percentage ?? 0) + "%" : "—",
              note: "Published best score",
              accent: "#8e6049",
              soft: "#faf1ec",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="group rounded-[1.55rem] border border-[#e6e2e9] bg-white p-4 shadow-[0_12px_36px_rgba(31,43,94,.055)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(31,43,94,.09)] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-[#808496]">{item.label}</div>
                    <div className="mt-2 text-3xl font-black text-[#1F2B5E]">{item.value}</div>
                    <div className="mt-1 text-[11px] font-bold text-[#a0a3b0]" dir="ltr">{item.note}</div>
                  </div>
                  <div
                    className="grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ background: item.soft, color: item.accent }}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {nextAction && recommendedCourse ? (
          <section className="mt-7 overflow-hidden rounded-[1.9rem] border border-[#e1dde6] bg-white shadow-[0_18px_55px_rgba(31,43,94,.07)]">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="p-5 sm:p-7 lg:p-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fbf2ed] px-3 py-1.5 text-[11px] font-black text-[#9a6249]">
                  <PlayCircle size={14} /> CONTINUE LEARNING
                </div>
                <h2 className="text-2xl font-black sm:text-3xl">خطوتك الأكاديمية التالية</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#74798c]">
                  {nextAction.inProgress
                    ? "لديك محاولة قيد التنفيذ. يمكنك العودة مباشرة ومتابعة الـSection من آخر نقطة."
                    : "يوجد اختبار متاح الآن. اختر الـSection الذي يناسبك وابدأ عندما تكون جاهزا."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={"/exam/" + nextAction.exam.id}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1F2B5E] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(31,43,94,.20)] transition hover:-translate-y-0.5"
                  >
                    <PlayCircle size={18} />
                    {nextAction.inProgress ? "متابعة الاختبار" : "فتح الاختبار"}
                  </a>
                  <a
                    href={"/course/" + recommendedCourse.id}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded9e4] bg-white px-5 text-sm font-black"
                  >
                    تفاصيل المقرر <ChevronLeft size={17} />
                  </a>
                </div>
              </div>

              <div className="relative min-h-[230px] overflow-hidden bg-[#1F2B5E]">
                <img
                  src={courseCover(recommendedCourse.code, recommendedCourse.default_cover_url)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover opacity-65"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E] via-[#1F2B5E]/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-xs font-black text-[#efc4ae]" dir="ltr">{recommendedCourse.code}</div>
                  <div className="mt-1 text-xl font-black" dir="ltr">{recommendedCourse.title}</div>
                  <div className="mt-2 text-xs font-bold text-white/65" dir="ltr">{nextAction.exam.title}</div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[.18em] text-[#B1785C]" dir="ltr">
                COURSE PORTFOLIO
              </div>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">مقرراتك الأكاديمية</h2>
              <p className="mt-2 text-sm font-medium text-[#7d8192]">
                اختر المقرر للوصول إلى Sections والمحاولات والنتائج والمراجعة التفصيلية.
              </p>
            </div>
            <div className="rounded-xl border border-[#e4e0e8] bg-white px-3 py-2 text-xs font-black text-[#73788b]">
              {data.courses.length} Active Courses
            </div>
          </div>

          {data.courses.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.courses.map((course) => {
                const visual = courseVisual(course.code);
                const metrics = courseMetrics(course.id);
                const cover = courseCover(course.code, course.default_cover_url);

                return (
                  <a
                    key={course.id}
                    href={"/course/" + course.id}
                    className="group relative overflow-hidden rounded-[1.8rem] border border-[#e3dfe7] bg-white shadow-[0_14px_42px_rgba(31,43,94,.065)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(31,43,94,.12)]"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={cover}
                        alt={"غلاف " + course.code}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E] via-[#1F2B5E]/35 to-transparent" />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                        <span className="rounded-full border border-white/18 bg-white/92 px-3 py-1.5 text-[11px] font-black text-[#1F2B5E] shadow-sm">
                          {visual.level}
                        </span>
                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-[#1F2B5E]/75 text-white backdrop-blur">
                          <ArrowUpLeft size={17} />
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <div className="text-xs font-black tracking-[.12em] text-[#efc4ae]" dir="ltr">{course.code}</div>
                        <h3 className="mt-1 text-xl font-black leading-7" dir="ltr">{course.title}</h3>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#f8f7fa] px-3 py-3 text-center">
                          <div className="text-lg font-black">{metrics.sections.length}</div>
                          <div className="mt-0.5 text-[10px] font-bold text-[#888c9d]">Sections</div>
                        </div>
                        <div className="rounded-xl bg-[#f8f7fa] px-3 py-3 text-center">
                          <div className="text-lg font-black">{metrics.completed}</div>
                          <div className="mt-0.5 text-[10px] font-bold text-[#888c9d]">Completed</div>
                        </div>
                        <div className="rounded-xl bg-[#f8f7fa] px-3 py-3 text-center">
                          <div className="text-lg font-black">{metrics.best ? metrics.best.toFixed(0) + "%" : "—"}</div>
                          <div className="mt-0.5 text-[10px] font-bold text-[#888c9d]">Best</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center justify-between text-[11px] font-black">
                            <span className="text-[#74798b]">التقدم</span>
                            <span style={{ color: visual.accent }}>{metrics.progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#eeecf1]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: metrics.progress + "%", background: visual.accent }}
                            />
                          </div>
                        </div>
                        <div
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                          style={{ background: visual.accentSoft, color: visual.accent }}
                        >
                          <BookOpenCheck size={19} />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#efedf2] pt-4 text-xs font-black">
                        <span className={metrics.open ? "text-emerald-700" : "text-[#8d91a0]"}>
                          {metrics.open ? metrics.open + " اختبار متاح الآن" : "عرض تفاصيل المقرر"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#1F2B5E]">
                          فتح المقرر <ChevronLeft size={15} />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-[#ccc7d4] bg-white p-10 text-center shadow-sm">
              <BookOpen className="mx-auto mb-4 text-[#B1785C]" size={38} />
              <h3 className="text-xl font-black">لا توجد مقررات مسجلة حتى الآن</h3>
              <p className="mt-2 text-sm text-[#777c8f]">ستظهر مقرراتك هنا فور إضافتها من الإدارة.</p>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[1.8rem] border border-[#e2dee6] bg-white p-5 shadow-[0_14px_42px_rgba(31,43,94,.055)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#B1785C]" dir="ltr">ACADEMIC EXPERIENCE</div>
                <h2 className="mt-1 text-xl font-black">كيف تعمل تجربتك في NUMO Intensive؟</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1f2ff] text-[#6366F1]">
                <GraduationCap size={21} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { n: "01", title: "اختر المقرر", note: "ادخل إلى Course Portfolio ثم اختر الـSection المطلوب." },
                { n: "02", title: "أكمل المحاولة", note: "كل سؤال إلزامي والإجابات تحفظ تلقائيا أثناء الاختبار." },
                { n: "03", title: "راجع وتطور", note: "شاهد الدرجة والأخطاء والتصحيح ثم أعد المحاولة إذا رغبت." },
              ].map((step) => (
                <div key={step.n} className="rounded-2xl border border-[#ece9ef] bg-[#faf9fb] p-4">
                  <div className="text-xs font-black text-[#B1785C]" dir="ltr">{step.n}</div>
                  <div className="mt-3 font-black">{step.title}</div>
                  <p className="mt-2 text-xs font-medium leading-6 text-[#7d8294]">{step.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] bg-[#1F2B5E] p-5 text-white shadow-[0_18px_50px_rgba(31,43,94,.17)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#e6b49b]" dir="ltr">SECURE ACCOUNT</div>
                <h2 className="mt-1 text-xl font-black">حسابك الأكاديمي محمي</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-emerald-200">
                <ShieldCheck size={21} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/7 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/12 text-emerald-200">
                  <CheckCircle2 size={19} />
                </div>
                <div>
                  <div className="text-sm font-black">Trusted Device Active</div>
                  <div className="mt-1 text-xs font-bold text-white/50">حساب الطالب مرتبط بهذا الجهاز.</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-white/55">
              <span dir="ltr">@{data.profile.username}</span>
              <span>NUMO Student</span>
            </div>
          </div>
        </section>

        {data.settings?.support_whatsapp || data.settings?.support_website ? (
          <section className="mt-8 overflow-hidden rounded-[1.8rem] border border-[#e2dee6] bg-white shadow-[0_14px_42px_rgba(31,43,94,.055)]">
            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fbf2ed] text-[#B1785C]">
                  <MessageCircle size={21} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#B1785C]" dir="ltr">NUMO SUPPORT</div>
                  <h2 className="mt-1 text-xl font-black">تحتاج مساعدة؟ فريق نمو معك.</h2>
                  <p className="mt-2 text-sm leading-7 text-[#74798c]">
                    دعم تسجيل الدخول، الجهاز الموثوق، الوصول للمقررات والاختبارات.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.settings.support_whatsapp ? (
                  <a
                    href={data.settings.support_whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F2B5E] px-4 text-sm font-black text-white"
                  >
                    <MessageCircle size={17} /> واتساب
                  </a>
                ) : null}
                {data.settings.support_website ? (
                  <a
                    href={data.settings.support_website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#ddd8e4] bg-white px-4 text-sm font-black"
                  >
                    الموقع الرسمي <ChevronLeft size={15} />
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#e4e0e7] py-5 text-center text-xs font-bold text-[#9296a5] sm:flex-row sm:text-right">
          <div>NUMO Platform for Education & Student Services</div>
          <div dir="ltr">NUMO INTENSIVE · Student Academic Portal</div>
        </footer>
      </main>
    </div>
  );
}
