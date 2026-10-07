"use client";

import type { FormEvent } from "react";
import NumoBrand from "@/app/components/NumoBrand";
import { BRAND, BRAND_FEATURES } from "@/lib/brand";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpLeft,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Layers3,
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
  catalogCourses: Array<{
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselInView, setCarouselInView] = useState(false);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const carouselRef = useRef<HTMLElement | null>(null);
  const carouselTouchStartX = useRef<number | null>(null);

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

  useEffect(() => {
    const node = carouselRef.current;
    if (!node || stage !== "portal") return;

    const observer = new IntersectionObserver(
      ([entry]) => setCarouselInView(entry.isIntersecting && entry.intersectionRatio >= 0.32),
      { threshold: [0, 0.32, 0.6] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [stage, data?.catalogCourses?.length]);

  useEffect(() => {
    const count = data?.catalogCourses?.length ?? data?.courses?.length ?? 0;
    if (count < 2 || !carouselInView || carouselPaused) return;

    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % count);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [carouselInView, carouselPaused, data?.catalogCourses?.length, data?.courses?.length]);

  useEffect(() => {
    const count = data?.catalogCourses?.length ?? data?.courses?.length ?? 0;
    if (!count) {
      setCarouselIndex(0);
      return;
    }
    setCarouselIndex((current) => current % count);
  }, [data?.catalogCourses?.length, data?.courses?.length]);

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
    const candidates = data.exams
      .map((exam) => {
        const attempts = data.attempts.filter((item) => item.exam_id === exam.id);
        const inProgress = attempts.find((item) => item.status === "IN_PROGRESS");
        const isOpen =
          now >= new Date(exam.starts_at).getTime() &&
          now <= new Date(exam.ends_at).getTime();
        return {
          exam,
          inProgress,
          attemptsRemaining: Math.max(0, exam.attempts_allowed - attempts.length),
          isOpen,
        };
      })
      .filter((item) => item.isOpen);

    return (
      candidates.find((item) => item.inProgress) ??
      candidates.find((item) => item.attemptsRemaining > 0) ??
      null
    );
  }, [data]);

  if (stage !== "portal") {
    return (
      <div className="min-h-screen px-4 py-8 text-[#1F2B5E] sm:py-12">
        <div className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-7 lg:grid-cols-[1.08fr_.92fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1F2B5E_0%,#26366F_68%,#202B5B_100%)] p-7 text-white shadow-[0_30px_84px_rgba(31,43,94,.26)] sm:p-9 lg:p-12">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#B1785C]/24 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#6366F1]/14 blur-3xl" />
            <div className="relative">
              <div className="mb-7 inline-flex rounded-[1.4rem] border border-white/15 bg-white p-2 shadow-[0_18px_45px_rgba(5,12,38,.22)]">
                <NumoBrand className="w-28" priority inverse />
              </div>

              <div className="max-w-3xl">
                <p className="text-sm font-black tracking-wide text-[#E7B79F]">{BRAND.description}</p>
                <h1 className="mt-3 text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl">
                  {BRAND.nameAr}
                </h1>
                <div className="mt-2 text-xs font-black uppercase tracking-[.2em] text-white/62 sm:text-sm" dir="ltr">
                  {BRAND.nameEn}
                </div>
                <h2 className="mt-7 text-2xl font-black leading-[1.5] text-white sm:text-3xl">
                  {BRAND.tagline}
                </h2>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/76 sm:text-lg sm:leading-9">
                  {BRAND.heroMessage}
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {BRAND_FEATURES.map((feature, index) => {
                  const FeatureIcon = [BookOpenCheck, CheckCircle2, Target][index];
                  return (
                    <div key={feature} className="rounded-2xl border border-white/12 bg-white/[.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
                      <FeatureIcon className="mb-3 text-[#E7B79F]" size={21} />
                      <strong className="block text-sm leading-6">{feature}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 border-t border-white/10 pt-5 text-sm font-black text-[#F3D6C7]">
                {BRAND.marketingLine}
              </div>
            </div>
          </section>

          <form
            onSubmit={login}
            className="rounded-[2rem] border border-[#e4e1eb] bg-white p-7 shadow-[0_24px_70px_rgba(31,43,94,.12)] lg:p-10"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <NumoBrand className="w-24" priority />
                <div className="min-w-0">
                  <div className="text-sm font-black text-[#1F2B5E]">{BRAND.nameAr}</div>
                  <div className="mt-1 text-[10px] font-black tracking-[.12em] text-[#B1785C]" dir="ltr">{BRAND.nameEn}</div>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f8f0ec] px-3 py-1.5 text-sm font-black text-[#9a6249]">
                <Sparkles size={15} /> {BRAND.description}
              </div>
              <h2 className="mt-4 text-3xl font-black">{BRAND.loginTitle}</h2>
              <p className="mt-2 leading-7 text-[#68708a]">
                {BRAND.loginHelper}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#9A6249]">{BRAND.loginNote}</p>
            </div>

            <label className="mb-5 block">
              <span className="mb-2 block font-black">اسم المستخدم</span>
              <input
                className="field"
                dir="ltr"
                autoComplete="username"
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block font-black">كلمة المرور</span>
              <input
                className="field"
                dir="ltr"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>

            {message ? (
              <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
                {message}
              </div>
            ) : null}

            <button className="btn w-full" disabled={stage === "loading"}>
              {stage === "loading" ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>

            <p className="mt-5 text-center text-xs leading-6 text-[#7c8193]">
              عند أول تسجيل دخول سيتم ربط الحساب بهذا الجهاز. لتغيير الجهاز تواصل مع الإدارة.
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const portalData = data;

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
    const sections = portalData.sections.filter((section) => examIds.has(section.exam_id));
    const completed = sections.filter((section) => completedSectionIds.has(section.id)).length;
    const scores = sections
      .map((section) => sectionBestScores.get(section.id))
      .filter((score): score is number => score !== undefined);
    const best = scores.length
      ? Math.max(...scores)
      : Math.max(
          0,
          ...portalData.results
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

  const catalogCourses = data.catalogCourses?.length ? data.catalogCourses : data.courses;
  const assignedCourseIds = new Set(data.courses.map((course) => course.id));
  const activeCarouselCourse = catalogCourses[carouselIndex] ?? null;
  const previousCarouselCourse = catalogCourses.length
    ? catalogCourses[(carouselIndex - 1 + catalogCourses.length) % catalogCourses.length]
    : null;
  const nextCarouselCourse = catalogCourses.length
    ? catalogCourses[(carouselIndex + 1) % catalogCourses.length]
    : null;

  function goCarousel(direction: 1 | -1) {
    if (!catalogCourses.length) return;
    setCarouselPaused(true);
    setCarouselIndex((current) => (current + direction + catalogCourses.length) % catalogCourses.length);
    window.setTimeout(() => setCarouselPaused(false), 6500);
  }

  const generalCourses = data.courses.filter((course) => {
    const code = course.code.trim().toUpperCase();
    return code.startsWith("GR") || code.startsWith("AR");
  });
  const intensiveCourses = data.courses.filter((course) => {
    const code = course.code.trim().toUpperCase();
    return !code.startsWith("GR") && !code.startsWith("AR");
  });

  function renderCourseCard(course: Dashboard["courses"][number]) {
    const visual = courseVisual(course.code);
    const metrics = courseMetrics(course.id);
    const cover = courseCover(course.code, course.default_cover_url);

    return (
      <a
        key={course.id}
        href={"/course/" + course.id}
        className="group relative overflow-hidden rounded-[2rem] border border-white/85 bg-white shadow-[0_18px_50px_rgba(31,43,94,.08)] ring-1 ring-[#e8e3ec] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(31,43,94,.14)]"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(145deg,#ffffff,#f7f6fa)]">
          <img
            src={cover}
            alt={"غلاف " + course.code}
            width={1536}
            height={864}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1F2B5E]/82 via-[#1F2B5E]/10 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <span className="rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[11px] font-black text-[#1F2B5E] shadow-sm backdrop-blur">
              {visual.level}
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-[#1F2B5E]/75 text-white backdrop-blur">
              <ArrowUpLeft size={17} />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="text-xs font-black tracking-[.12em] text-[#efc4ae]" dir="ltr">{course.code}</div>
            <h3 className="mt-1 text-xl font-black leading-7" dir="auto">{course.title}</h3>
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

          <div className="mt-4 grid gap-2 border-t border-[#efedf2] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <span className={
              "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black " +
              (metrics.open
                ? "border border-[#ead4c8] bg-[#fff7f2] text-[#9a6249]"
                : "bg-[#f7f7fa] text-[#8d91a0]")
            }>
              {metrics.open ? <PlayCircle size={14} /> : <BookOpenCheck size={14} />}
              {metrics.open ? metrics.open + " اختبار متاح الآن" : "عرض تفاصيل المقرر"}
            </span>
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#8D91FF]/30 bg-[linear-gradient(135deg,#1F2B5E,#4A52C6)] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(31,43,94,.24)]">
              <BookOpenCheck size={15} /> فتح المقرر <ChevronLeft size={15} />
            </span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[radial-gradient(circle_at_12%_8%,rgba(99,102,241,.08),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(177,120,92,.10),transparent_26%),linear-gradient(180deg,#fbfbfd_0%,#f5f6fa_46%,#f8f5f3_100%)] text-[#1F2B5E]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 shadow-[0_10px_35px_rgba(31,43,94,.07)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <NumoBrand horizontal priority className="w-auto" />
            <div className="hidden h-9 w-px bg-[#e6e2e9] lg:block" />
            <div className="hidden lg:block">
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-[#B1785C]" dir="ltr">
                {BRAND.nameEn}
              </div>
              <div className="mt-0.5 text-xs font-bold text-[#7b8092]">
                بوابة الطالب الأكاديمية
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-2xl border border-[#e6e2ea] bg-white/90 p-1.5 shadow-[0_10px_28px_rgba(31,43,94,.05)] xl:flex">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1F2B5E,#303f86)] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(31,43,94,.18)]">
              <LayoutDashboard size={15} /> الرئيسية
            </span>
            <a href="#course-portfolio" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-[#6d7287] transition hover:bg-[#f6f4f8] hover:text-[#1F2B5E]">
              <BookOpenCheck size={15} /> مقرراتي
            </a>
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

      <main className="mx-auto w-full max-w-[1480px] overflow-x-clip px-3 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2.1rem] border border-white/10 bg-[linear-gradient(135deg,#1F2B5E_0%,#253574_48%,#6366F1_100%)] text-white shadow-[0_34px_100px_rgba(31,43,94,.28)] sm:rounded-[2.6rem]">
          <div className="absolute inset-0 opacity-[.16] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#B1785C]/28 blur-3xl" />
          <div className="absolute -bottom-28 left-[12%] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-[44%] top-[12%] h-48 w-48 rounded-full bg-[#6366F1]/35 blur-2xl" />

          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(360px,.9fr)_minmax(0,1.1fr)] lg:items-center lg:p-10 xl:p-12">
            <div className="order-1 lg:order-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-3 py-2 text-[11px] font-black text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                <Sparkles size={14} className="text-[#e6b49b]" />
                {BRAND.description}
              </div>

              <p className="text-xs font-black text-white/55">أهلًا {firstName}</p>
              <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[1.35] sm:text-4xl lg:text-[3.35rem] xl:text-[3.8rem]">
                {BRAND.studentWelcome}
              </h1>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-8 text-white/74 sm:text-base sm:leading-9">
                {BRAND.studentSubtitle}
              </p>
              <div className="mt-3 text-sm font-black text-[#E7B79F]">{BRAND.marketingLine}</div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#course-portfolio"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#1F2B5E] shadow-[0_14px_34px_rgba(0,0,0,.15)] transition hover:-translate-y-0.5"
                >
                  <BookOpenCheck size={18} /> استعرض مقرراتي
                </a>
                {nextAction ? (
                  <a
                    href={"/exam/" + nextAction.exam.id}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                  >
                    <PlayCircle size={18} /> ابدأ الاختبار المتاح
                  </a>
                ) : null}
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.08] px-3 py-2 text-xs font-black">
                  <ShieldCheck size={15} className="text-emerald-300" /> جهاز موثوق
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.08] px-3 py-2 text-xs font-black">
                  <Layers3 size={15} className="text-[#e7b79f]" /> {totalSections} أقسام
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.08] px-3 py-2 text-xs font-black">
                  <Target size={15} className="text-indigo-200" /> {openExams.length} اختبار متاح
                </span>
              </div>
            </div>

            <div className="order-2 lg:order-1">
              <div className="relative mx-auto aspect-square w-full max-w-[470px]">
                <div className="absolute inset-[10%] rounded-full border border-white/16 bg-white/[.04] shadow-[0_0_70px_rgba(99,102,241,.26)] backdrop-blur-sm" />
                <div className="absolute inset-[19%] rounded-full border border-white/20 bg-[radial-gradient(circle,rgba(255,255,255,.16),rgba(255,255,255,.04)_58%,transparent_60%)]" />
                <div className="absolute inset-[27%] grid place-items-center rounded-[2.3rem] border border-white/20 bg-white shadow-[0_24px_60px_rgba(14,20,55,.28)]">
                  <div className="text-center">
                    <NumoBrand className="mx-auto w-24 sm:w-28" priority />
                    <div className="mt-4 text-[9px] font-black uppercase tracking-[.14em] text-[#B1785C]" dir="ltr">
                      {BRAND.nameEn}
                    </div>
                    <div className="mt-1 text-sm font-black text-[#1F2B5E]">{BRAND.nameAr}</div>
                  </div>
                </div>

                <div className="absolute left-[3%] top-[17%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#6366F1] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <GraduationCap size={28} />
                </div>
                <div className="absolute right-[3%] top-[18%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#1F2B5E] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <BookOpenCheck size={27} />
                </div>
                <div className="absolute left-[1%] top-[47%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#B1785C] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <Target size={27} />
                </div>
                <div className="absolute right-[1%] top-[48%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#6366F1] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <Trophy size={27} />
                </div>
                <div className="absolute bottom-[9%] left-[16%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#1F2B5E] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <BarChart3 size={27} />
                </div>
                <div className="absolute bottom-[8%] right-[16%] grid h-16 w-16 place-items-center rounded-2xl border border-white/35 bg-white/95 text-[#B1785C] shadow-[0_14px_30px_rgba(16,25,63,.18)] sm:h-[72px] sm:w-[72px]">
                  <ShieldCheck size={27} />
                </div>

                <div className="absolute left-1/2 top-[5%] h-2 w-2 -translate-x-1/2 rounded-full bg-[#e8b59b] shadow-[0_0_18px_rgba(232,181,155,.9)]" />
                <div className="absolute bottom-[4%] left-[48%] h-2 w-2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.9)]" />
              </div>
            </div>
          </div>

          <div className="relative grid border-t border-white/10 bg-black/5 sm:grid-cols-3">
            {[
              { label: "التقدم الأكاديمي", value: overallProgress + "%", note: completedSections + " من " + (totalSections || 0) + " مكتمل", icon: BarChart3 },
              { label: "أفضل نتيجة", value: bestPublishedResult ? (bestPublishedResult.percentage ?? 0) + "%" : "—", note: "Best Published Score", icon: Medal },
              { label: "اختبارات متاحة", value: openExams.length, note: "Available Now", icon: PlayCircle },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={"flex items-center gap-3 px-5 py-4 sm:px-6 " + (index ? "border-t border-white/10 sm:border-r-0 sm:border-t-0 sm:border-s" : "")}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#edc2ad]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/50">{item.label}</div>
                    <div className="mt-0.5 text-2xl font-black">{item.value}</div>
                    <div className="text-[10px] font-bold text-white/45" dir="auto">{item.note}</div>
                  </div>
                </div>
              );
            })}
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
                className="group relative overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/92 p-4 shadow-[0_16px_42px_rgba(31,43,94,.07)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(31,43,94,.12)] sm:p-5"
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

        {catalogCourses.length && activeCarouselCourse ? (
          <section
            ref={carouselRef}
            className="-mx-3 mt-8 overflow-hidden rounded-none border-y border-[#dcd6e2] bg-[#0f1738] shadow-[0_34px_110px_rgba(31,43,94,.18)] ring-1 ring-white/90 sm:mx-0 sm:rounded-[3rem] sm:border"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
            onFocusCapture={() => setCarouselPaused(true)}
            onBlurCapture={() => setCarouselPaused(false)}
            onTouchStart={(event) => {
              carouselTouchStartX.current = event.touches[0]?.clientX ?? null;
              setCarouselPaused(true);
            }}
            onTouchEnd={(event) => {
              const startX = carouselTouchStartX.current;
              const endX = event.changedTouches[0]?.clientX ?? null;
              carouselTouchStartX.current = null;
              if (startX !== null && endX !== null && Math.abs(endX - startX) > 44) {
                goCarousel(endX < startX ? 1 : -1);
              }
              window.setTimeout(() => setCarouselPaused(false), 6200);
            }}
            aria-label="معرض المقررات الفاخر"
          >
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_14%_12%,rgba(99,102,241,.34),transparent_26%),radial-gradient(circle_at_86%_14%,rgba(177,120,92,.28),transparent_24%),linear-gradient(135deg,#0d1432_0%,#1F2B5E_46%,#303f86_100%)] px-0 pb-7 pt-6 sm:px-7 sm:pb-9 sm:pt-8 lg:px-10 lg:pb-11">
              <div className="pointer-events-none absolute inset-0 opacity-[.10] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full border border-white/[.07]" />
              <div className="pointer-events-none absolute -right-24 bottom-[-5rem] h-96 w-96 rounded-full border border-[#B1785C]/16" />
              <div className="pointer-events-none absolute left-[42%] top-[-8rem] h-72 w-72 rounded-full bg-white/[.06] blur-3xl" />

              <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 sm:px-0">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[#edc1aa] backdrop-blur" dir="ltr">
                    <Sparkles size={13} />
                    NUMO ACADEMIC COLLECTION
                  </div>
                  <h2 className="mt-3 text-2xl font-black leading-[1.35] text-white sm:text-3xl lg:text-[2.55rem]">
                    المجموعة الأكاديمية
                  </h2>
                  <div className="mt-4 max-w-3xl rounded-[1.35rem] border border-[#E8B59E]/30 bg-[linear-gradient(110deg,rgba(255,255,255,.11),rgba(177,120,92,.10),rgba(99,102,241,.08))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_10px_30px_rgba(7,12,36,.14)] backdrop-blur-md sm:px-5 sm:py-4">
                    <p className="text-[16px] font-black leading-8 text-[#FFF7F2] drop-shadow-[0_1px_1px_rgba(0,0,0,.20)] sm:text-[17px] sm:leading-8">
                      مقررات ودورات منصة نُمو في واجهة أكاديمية فاخرة، واضحة ومتكاملة.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-white/12 bg-white/[.08] px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur">
                    <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/40" dir="ltr">SHOWCASE</div>
                    <div className="mt-1 text-lg font-black text-white" dir="ltr">
                      {String(carouselIndex + 1).padStart(2, "0")} / {String(catalogCourses.length).padStart(2, "0")}
                    </div>
                  </div>

                </div>
              </div>

              <div className="relative mt-6 min-h-[360px] sm:mt-9 sm:min-h-[540px] lg:min-h-[680px] xl:min-h-[760px]">
                {catalogCourses.length > 2 && previousCarouselCourse ? (
                  <button
                    type="button"
                    onClick={() => goCarousel(-1)}
                    className="absolute left-[-14%] top-1/2 z-[1] hidden w-[43%] -translate-y-1/2 rotate-[-5deg] rounded-[2rem] border border-white/10 bg-white/[.035] p-2 opacity-30 shadow-[0_30px_80px_rgba(0,0,0,.35)] transition duration-500 hover:opacity-50 lg:block"
                    aria-label={"عرض " + previousCarouselCourse.code}
                  >
                    <div className="aspect-[16/9] overflow-hidden rounded-[1.55rem] bg-white p-2">
                      <img
                        src={courseCover(previousCarouselCourse.code, previousCarouselCourse.default_cover_url)}
                        alt=""
                        width={1536}
                        height={864}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </button>
                ) : null}

                {catalogCourses.length > 2 && nextCarouselCourse ? (
                  <button
                    type="button"
                    onClick={() => goCarousel(1)}
                    className="absolute right-[-14%] top-1/2 z-[1] hidden w-[43%] -translate-y-1/2 rotate-[5deg] rounded-[2rem] border border-white/10 bg-white/[.035] p-2 opacity-30 shadow-[0_30px_80px_rgba(0,0,0,.35)] transition duration-500 hover:opacity-50 lg:block"
                    aria-label={"عرض " + nextCarouselCourse.code}
                  >
                    <div className="aspect-[16/9] overflow-hidden rounded-[1.55rem] bg-white p-2">
                      <img
                        src={courseCover(nextCarouselCourse.code, nextCarouselCourse.default_cover_url)}
                        alt=""
                        width={1536}
                        height={864}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </button>
                ) : null}

                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="relative w-full max-w-[1220px] px-0 sm:px-3 lg:px-5 xl:px-8">
                    <div className="pointer-events-none absolute inset-x-[9%] bottom-[-24px] h-20 rounded-[50%] bg-black/40 blur-2xl" />
                    <div className="course-showcase-frame relative rounded-[1.35rem] border border-[#d6a089]/65 bg-[linear-gradient(145deg,#fffdfb,#f3efec)] p-1.5 shadow-[0_44px_120px_rgba(3,8,30,.56),0_0_0_1px_rgba(255,255,255,.68)_inset] sm:rounded-[2.5rem] sm:p-3 lg:p-4">
                      <div className="rounded-[1.05rem] border border-[#e0dbe4] bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.95)] sm:rounded-[2rem] sm:p-2">
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[.8rem] bg-white sm:rounded-[1.6rem]">
                          <img
                            key={activeCarouselCourse.id}
                            src={courseCover(activeCarouselCourse.code, activeCarouselCourse.default_cover_url)}
                            alt={"غلاف " + activeCarouselCourse.code}
                            width={1536}
                            height={864}
                            decoding="async"
                            className="h-full w-full object-contain [animation:courseReveal_.72s_cubic-bezier(.22,.61,.36,1)]"
                          />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute -left-1 top-1/2 h-20 w-1 -translate-y-1/2 rounded-full bg-[linear-gradient(#B1785C,#f0c5af,#B1785C)] shadow-[0_0_20px_rgba(177,120,92,.45)]" />
                      <div className="pointer-events-none absolute -right-1 top-1/2 h-20 w-1 -translate-y-1/2 rounded-full bg-[linear-gradient(#6366F1,#b6b8ff,#6366F1)] shadow-[0_0_20px_rgba(99,102,241,.45)]" />
                    </div>
                  </div>
                </div>

                {catalogCourses.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => goCarousel(-1)}
                      className="absolute left-2 bottom-0 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#0c1435]/92 text-white shadow-[0_16px_38px_rgba(0,0,0,.32)] backdrop-blur transition hover:scale-105 hover:bg-[#1F2B5E] sm:left-3 sm:bottom-auto sm:top-1/2 sm:h-12 sm:w-12 sm:-translate-y-1/2"
                      aria-label="المقرر السابق"
                    >
                      <ChevronLeft size={21} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goCarousel(1)}
                      className="absolute right-2 bottom-0 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#0c1435]/92 text-white shadow-[0_16px_38px_rgba(0,0,0,.32)] backdrop-blur transition hover:scale-105 hover:bg-[#1F2B5E] sm:right-3 sm:bottom-auto sm:top-1/2 sm:h-12 sm:w-12 sm:-translate-y-1/2"
                      aria-label="المقرر التالي"
                    >
                      <ChevronRight size={21} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="relative bg-[linear-gradient(180deg,#ffffff_0%,#fbfafc_100%)] p-4 sm:p-6 lg:px-8 lg:py-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f9efe9] px-3 py-1.5 text-[10px] font-black tracking-[.14em] text-[#9a6249]" dir="ltr">
                      {activeCarouselCourse.code}
                    </span>
                    <span className={
                      "rounded-full px-3 py-1.5 text-[10px] font-black " +
                      (assignedCourseIds.has(activeCarouselCourse.id)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[#f1f2ff] text-[#5b5fd5]")
                    }>
                      {assignedCourseIds.has(activeCarouselCourse.id) ? "ممنوح لك" : "من كتالوج نمو"}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#a5a8b4]" dir="ltr">
                      {courseVisual(activeCarouselCourse.code).level}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-black text-[#1F2B5E] sm:text-2xl" dir="auto">
                    {activeCarouselCourse.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-[#777c8f]">
                    {activeCarouselCourse.description || "تجربة أكاديمية مصممة بعناية ضمن منظومة NUMO التعليمية."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {assignedCourseIds.has(activeCarouselCourse.id) ? (
                    <a
                      href={"/course/" + activeCarouselCourse.id}
                      className="group relative inline-flex min-h-16 flex-1 items-center justify-center gap-3 overflow-hidden rounded-[1.15rem] border border-[#9CA0FF]/45 bg-[linear-gradient(135deg,#111A42_0%,#1F2B5E_42%,#4850C7_78%,#6366F1_100%)] px-7 text-[15px] font-black text-white shadow-[0_20px_46px_rgba(31,43,94,.34),0_0_0_1px_rgba(255,255,255,.10)_inset,0_0_26px_rgba(99,102,241,.12)] ring-1 ring-white/5 transition duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_28px_62px_rgba(31,43,94,.42),0_0_34px_rgba(99,102,241,.22)] sm:flex-none"
                    >
                      <span className="pointer-events-none absolute inset-0 translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.16),transparent)] transition-transform duration-700 group-hover:-translate-x-full" />
                      <span className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,.16)]">
                        <BookOpenCheck size={20} />
                      </span>
                      <span className="relative">
                        <span className="block text-[15px] font-black">فتح المقرر</span>
                        <span className="mt-0.5 block text-[9px] font-bold tracking-[.12em] text-white/60" dir="ltr">OPEN COURSE</span>
                      </span>
                      <ChevronLeft className="relative transition-transform duration-300 group-hover:-translate-x-1" size={18} />
                    </a>
                  ) : (
                    <div className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#eadbd3] bg-[#fff8f4] px-5 text-sm font-black text-[#9a6249] sm:flex-none">
                      يمنح من مدير النظام
                    </div>
                  )}
                </div>
              </div>

              {catalogCourses.length > 1 ? (
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,#ddd7e2)]" />
                  <div className="flex max-w-full items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
                    {catalogCourses.map((course, index) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setCarouselIndex(index);
                          setCarouselPaused(true);
                          window.setTimeout(() => setCarouselPaused(false), 6200);
                        }}
                        className={
                          "shrink-0 rounded-full transition-all duration-300 " +
                          (index === carouselIndex
                            ? "h-2.5 w-10 bg-[linear-gradient(90deg,#B1785C,#6366F1)] shadow-[0_3px_12px_rgba(99,102,241,.22)]"
                            : "h-2.5 w-2.5 bg-[#d8d4dd] hover:bg-[#aaa5b3]")
                        }
                        aria-label={"عرض " + course.code}
                      />
                    ))}
                  </div>
                  <div className="h-px flex-1 bg-[linear-gradient(90deg,#ddd7e2,transparent)]" />
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 border-t border-[#ece8ef] pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-[#B1785C]" dir="ltr">YOUR NEXT STEP</div>
                  <div className="mt-1 text-base font-black leading-7 text-[#1F2B5E]">
                    {nextAction
                      ? nextAction.inProgress
                        ? "لديك محاولة قيد التنفيذ ويمكنك متابعتها الآن."
                        : "يوجد اختبار متاح لك الآن — ابدأ عندما تكون جاهزًا."
                      : "لا توجد محاولة معلقة حاليًا؛ مقرراتك الممنوحة لك تظهر في القسم التالي."}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextAction ? (
                    <a
                      href={"/exam/" + nextAction.exam.id}
                      className="group relative inline-flex min-h-16 items-center justify-center gap-3 overflow-hidden rounded-[1.15rem] border border-[#F0C2AA]/65 bg-[linear-gradient(135deg,#7E4C38_0%,#B1785C_42%,#D99675_72%,#E8B094_100%)] px-7 text-[15px] font-black text-white shadow-[0_20px_46px_rgba(177,120,92,.34),0_0_0_1px_rgba(255,255,255,.14)_inset,0_0_24px_rgba(214,154,124,.12)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_28px_60px_rgba(177,120,92,.44),0_0_34px_rgba(214,154,124,.24)]"
                    >
                      <span className="pointer-events-none absolute inset-0 translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.18),transparent)] transition-transform duration-700 group-hover:-translate-x-full" />
                      <span className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/18 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,.18)]">
                        <PlayCircle size={21} />
                      </span>
                      <span className="relative text-right">
                        <span className="block text-[15px] font-black">{nextAction.inProgress ? "متابعة الاختبار" : "اختبار متاح الآن"}</span>
                        <span className="mt-0.5 block text-[9px] font-bold tracking-[.12em] text-white/65" dir="ltr">
                          {nextAction.inProgress ? "CONTINUE EXAM" : "START NOW"}
                        </span>
                      </span>
                      <ChevronLeft className="relative transition-transform duration-300 group-hover:-translate-x-1" size={18} />
                    </a>
                  ) : null}
                  <a
                    href="#course-portfolio"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfdae5] bg-[#faf9fb] px-4 text-xs font-black text-[#1F2B5E]"
                  >
                    <BookOpenCheck size={16} /> مقرراتي الأكاديمية
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="course-portfolio" className="mt-10 scroll-mt-28">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[.18em] text-[#B1785C]" dir="ltr">
                COURSE PORTFOLIO
              </div>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">مقرراتك الأكاديمية</h2>
              <p className="mt-2 text-sm font-medium text-[#7d8192]">
                تظهر هنا فقط المقررات والكورسات التي منحها لك مدير النظام، ومنها تصل إلى الاختبارات والمحاولات والنتائج والمراجعة التفصيلية.
              </p>
            </div>
            <div className="rounded-xl border border-[#e4e0e8] bg-white px-3 py-2 text-xs font-black text-[#73788b]">
              {data.courses.length} Assigned Courses
            </div>
          </div>

          {data.courses.length ? (
            <div className="space-y-8">
              {generalCourses.length ? (
                <section>
                  <div className="mb-5 flex items-center justify-between gap-3 overflow-hidden rounded-[1.5rem] border border-[#eadfd8] bg-[linear-gradient(110deg,#fffaf7_0%,#ffffff_58%,#f4f3ff_100%)] px-5 py-4 shadow-[0_12px_32px_rgba(31,43,94,.05)]">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#B1785C]" dir="ltr">GENERAL STUDIES</div>
                      <h3 className="mt-1 text-xl font-black">المواد العامة</h3>
                    </div>
                    <div className="rounded-xl bg-[#1F2B5E] px-3 py-2 text-xs font-black text-white">
                      {generalCourses.length} مقررات
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {generalCourses.map(renderCourseCard)}
                  </div>
                </section>
              ) : null}

              {intensiveCourses.length ? (
                <section>
                  {generalCourses.length ? (
                    <div className="mb-5 flex items-center justify-between gap-3 overflow-hidden rounded-[1.5rem] border border-[#e2e4f0] bg-[linear-gradient(110deg,#f8f8ff_0%,#ffffff_58%,#fff9f6_100%)] px-5 py-4 shadow-[0_12px_32px_rgba(31,43,94,.05)]">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#6366F1]" dir="ltr">ENGLISH INTENSIVE</div>
                        <h3 className="mt-1 text-xl font-black">دورات اللغة الإنجليزية المكثفة</h3>
                      </div>
                      <div className="rounded-xl bg-[#6366F1] px-3 py-2 text-xs font-black text-white">
                        {intensiveCourses.length} مقررات
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {intensiveCourses.map(renderCourseCard)}
                  </div>
                </section>
              ) : null}
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
          <div className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-[0_14px_42px_rgba(31,43,94,.055)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#B1785C]" dir="ltr">ACADEMIC EXPERIENCE</div>
                <h2 className="mt-1 text-xl font-black">كيف تعمل تجربتك في {BRAND.nameAr}؟</h2>
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

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.07] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/[.12] text-emerald-200">
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
          <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_14px_42px_rgba(31,43,94,.055)]">
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

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#e4e0e7] py-6 text-center text-xs font-bold text-[#9296a5] sm:flex-row sm:text-right">
          <div>NUMO Platform for Education & Student Services</div>
          <div dir="ltr">{BRAND.nameEn} · Student Academic Portal</div>
        </footer>
      </main>
    </div>
  );
}
