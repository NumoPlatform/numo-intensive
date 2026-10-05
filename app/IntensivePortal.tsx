"use client";

import type { FormEvent } from "react";
import NumoBrand from "@/app/components/NumoBrand";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LockKeyhole,
  LogOut,
  MessageCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
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
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1F2B5E] via-[#2e3f82] to-[#6366F1] p-8 text-white shadow-[0_28px_80px_rgba(31,43,94,.28)] lg:p-12">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#B1785C]/30 blur-3xl" />
            <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="mb-9 inline-flex rounded-[1.4rem] border border-white/15 bg-white p-2 shadow-2xl shadow-black/15">
                <NumoBrand className="w-28" priority inverse />
              </div>
              <p className="mb-3 text-sm font-black tracking-wide text-[#e9c2ad]">تعلم مركز. استعداد أذكى.</p>
              <h1 className="max-w-2xl text-4xl font-black leading-[1.35] lg:text-6xl">
                الدورات المكثفة للغة الإنجليزية
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-9 text-white/80">
                بوابتك الخاصة للدورات المكثفة والتدريب والاختبارات.
              </p>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                <div className="intensive-glass rounded-2xl p-4">
                  <ShieldCheck className="mb-3 text-[#f0c7b2]" />
                  <strong className="block">جهاز واحد لكل طالب</strong>
                  <span className="mt-1 block text-sm text-white/70">يرتبط حسابك بأول جهاز موثوق يتم تسجيل الدخول منه.</span>
                </div>
                <div className="intensive-glass rounded-2xl p-4">
                  <LockKeyhole className="mb-3 text-[#f0c7b2]" />
                  <strong className="block">حسابات تديرها منصة نمو</strong>
                  <span className="mt-1 block text-sm text-white/70">يتم إنشاء اسم المستخدم وكلمة المرور من خلال إدارة نمو.</span>
                </div>
              </div>
            </div>
          </section>

          <form
            onSubmit={login}
            className="rounded-[2rem] border border-[#e4e1eb] bg-white p-7 shadow-[0_24px_70px_rgba(31,43,94,.12)] lg:p-10"
          >
            <div className="mb-8">
              <NumoBrand className="w-24" priority />
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f8f0ec] px-3 py-1.5 text-sm font-black text-[#9a6249]">
                <Sparkles size={15} /> منصة نمو
              </div>
              <h2 className="mt-4 text-3xl font-black">تسجيل الدخول</h2>
              <p className="mt-2 leading-7 text-[#68708a]">
                استخدم بيانات الدخول التي زودتك بها إدارة نمو.
              </p>
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

  return (
    <div className="min-h-screen px-4 py-7 text-[#1F2B5E] sm:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-[#e3dfE8] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(31,43,94,.07)]">
          <NumoBrand className="w-24 sm:w-28" priority />
          <div className="hidden items-center gap-2 text-sm font-black text-[#60667b] md:flex">
            <span className="rounded-xl bg-[#f4f3fb] px-4 py-2">الرئيسية</span>
            <span className="rounded-xl px-4 py-2">دوراتي</span>
            <span className="rounded-xl px-4 py-2">الاختبارات</span>
            <span className="rounded-xl px-4 py-2">النتائج</span>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-[#ded9e5] bg-white px-4 py-3 font-black text-[#1F2B5E] transition hover:bg-[#f8f7fb]"
          >
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </header>

        <section className="relative mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#263775] to-[#6366F1] p-6 text-white shadow-[0_28px_75px_rgba(31,43,94,.22)] sm:p-8 lg:p-10">
          <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-[#B1785C]/25 blur-3xl" />
          <div className="absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-[#6366F1]/30 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-[#f4d0bd]">
                <Sparkles size={15} /> بوابتك الأكاديمية للدورات المكثفة
              </div>
              <h1 className="text-3xl font-black leading-[1.45] sm:text-4xl lg:text-5xl">
                مرحبا بك، <span className="text-[#d99a79]">{data.profile.full_name}</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-white/75 sm:text-base">
                كل مقرراتك واختباراتك ونتائجك في مكان واحد، بتجربة فخمة وواضحة مصممة لتساعدك على التركيز والتقدم.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">Grammar</span>
                <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">Vocabulary</span>
                <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">Reading</span>
                <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">4 محاولات لكل قسم</span>
              </div>
            </div>
            <div className="min-w-[220px] rounded-[1.6rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#B1785C] text-white">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="font-black">حساب الطالب</div>
                  <div className="text-xs text-white/60" dir="ltr">@{data.profile.username}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100">
                <ShieldCheck size={16} /> الجهاز الحالي موثوق
              </div>
            </div>
          </div>
        </section>

        {data.courses.length ? (
          <section className="mb-7">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-black tracking-[.14em] text-[#B1785C]">دوراتي</div>
                <h2 className="mt-1 text-2xl font-black text-[#1F2B5E]">المقررات المسجلة</h2>
              </div>
              <div className="text-xs font-bold text-[#777c8f]">{data.courses.length} مقرر</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {data.courses.map((course) => {
                const visual = courseVisual(course.code);
                const exams = examsByCourse.get(course.id) ?? [];
                const results = data.results.filter((result) => exams.some((exam) => exam.id === result.exam_id));
                const best = [...results].filter((item) => item.percentage !== null).sort((a,b)=>Number(b.percentage ?? 0)-Number(a.percentage ?? 0))[0];
                return (
                  <a key={course.id} href={"/course/" + course.id} className="group overflow-hidden rounded-[1.4rem] border border-[#e5e1e9] bg-white shadow-[0_12px_34px_rgba(31,43,94,.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(31,43,94,.12)]">
                    <div className="relative h-32 overflow-hidden">
                      <img src={courseCover(course.code, course.default_cover_url)} alt={"أيقونة " + course.code} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E]/65 via-transparent to-transparent" />
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-[#1F2B5E]">{visual.level}</span>
                    </div>
                    <div className="p-4">
                      <div dir="ltr" className="text-lg font-black text-[#1F2B5E]">{course.code}</div>
                      <div className="mt-1 text-xs font-bold text-[#7b8092]">{visual.label}</div>
                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="font-black" style={{color: visual.accent}}>{best ? (best.percentage ?? 0) + "% أفضل درجة" : "ابدأ الآن"}</span>
                        <span className="text-[#8b8f9f]">{exams.length} أقسام</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {nextAction ? (
          <section className="mb-6 overflow-hidden rounded-[1.6rem] border border-[#ded9e6] bg-white shadow-[0_16px_45px_rgba(31,43,94,.07)]">
            <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <div className="text-xs font-black tracking-wide text-[#B1785C]">الخطوة التالية المقترحة</div>
                <h2 dir="ltr" className="mt-1 text-xl font-black text-[#1F2B5E]">{nextAction.exam.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[#6f7488]">
                  {nextAction.inProgress
                    ? "لديك محاولة قيد التنفيذ. أكملها قبل انتهاء الوقت."
                    : "هذا القسم متاح الآن ويمكنك بدء محاولة جديدة."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-[#f2f1ff] px-3 py-1.5 text-[#5559ca]">
                    {nextAction.attemptsRemaining} محاولات متبقية
                  </span>
                  <span className="rounded-full bg-[#fbf2ed] px-3 py-1.5 text-[#9a6249]">
                    النتيجة تظهر مباشرة بعد إنهاء القسم
                  </span>
                </div>
              </div>
              <a href={"/exam/" + nextAction.exam.id} className="btn min-w-[170px]">
                <PlayCircle size={17} />
                {nextAction.inProgress ? "متابعة المحاولة" : "بدء القسم"}
              </a>
            </div>
          </section>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e0e9] bg-white p-5 shadow-sm">
            <BookOpen className="mb-3 text-[#B1785C]" />
            <div className="text-3xl font-black">{data.courses.length}</div>
            <div className="text-sm text-[#68708a]">المواد المسجلة</div>
          </div>
          <div className="rounded-2xl border border-[#e3e0e9] bg-white p-5 shadow-sm">
            <Clock3 className="mb-3 text-[#6366F1]" />
            <div className="text-3xl font-black">{data.exams.length}</div>
            <div className="text-sm text-[#68708a]">الاختبارات المتاحة</div>
          </div>
          <div className="rounded-2xl border border-[#e3e0e9] bg-white p-5 shadow-sm">
            <ShieldCheck className="mb-3 text-[#B1785C]" />
            <div className="text-xl font-black">الجهاز الموثوق</div>
            <div className="text-sm text-[#68708a]">حسابك مرتبط بهذا الجهاز</div>
          </div>
        </div>

        {data.courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cfc9d9] bg-white p-10 text-center">
            <BookOpen className="mx-auto mb-4 text-[#B1785C]" size={38} />
            <h2 className="text-xl font-black">لا توجد مواد مسجلة حتى الآن</h2>
            <p className="mt-2 text-[#68708a]">ستظهر موادك هنا بعد إضافتها من قبل الإدارة.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.courses.map((course) => {
              const sectionOrder = ["Grammar", "Vocabulary", "Reading"];
              const exams = [...(examsByCourse.get(course.id) ?? [])].sort((a, b) => {
                const aName = a.title.split("—").pop()?.trim() ?? "";
                const bName = b.title.split("—").pop()?.trim() ?? "";
                const aRank = sectionOrder.indexOf(aName);
                const bRank = sectionOrder.indexOf(bName);
                if (aRank !== -1 || bRank !== -1) {
                  return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
                }
                return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
              });

              const courseAttempts = data.attempts.filter((item) => exams.some((exam) => exam.id === item.exam_id));
              const courseResults = data.results.filter((item) => exams.some((exam) => exam.id === item.exam_id));
              const completedSections = new Set(courseResults.map((item) => item.exam_id)).size;
              const courseBest = [...courseResults]
                .filter((item) => item.percentage !== null)
                .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];
              const visual = courseVisual(course.code);
              const cover = courseCover(course.code, course.default_cover_url);

              return (
                <section
                  key={course.id}
                  className="overflow-hidden rounded-[2rem] border border-[#e2dfeb] bg-white shadow-[0_20px_60px_rgba(31,43,94,.08)] lg:col-span-2"
                >
                  <div className="relative overflow-hidden bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-6 text-white sm:p-8">
                    <img
                      src={cover}
                      alt={"غلاف " + course.code}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-[#1F2B5E]/96 via-[#1F2B5E]/78 to-[#1F2B5E]/38" />

                    <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                      <div>
                        <div dir="ltr" className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black">
                          <GraduationCap size={15} /> {course.code} · {visual.level}
                        </div>
                        <h2 dir="ltr" className="max-w-2xl text-2xl font-black sm:text-3xl">{course.title}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
                          اختر القسم الذي تريد التدرب عليه، أجب عن جميع أسئلته، ثم شاهد درجتك والأسئلة التي أخطأت فيها مباشرة.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                          <div className="text-2xl font-black">{exams.length}</div>
                          <div className="text-[11px] font-bold text-white/65">الأقسام</div>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                          <div className="text-2xl font-black">{completedSections}</div>
                          <div className="text-[11px] font-bold text-white/65">المكتمل</div>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                          <div className="text-2xl font-black">{courseBest?.percentage ?? "—"}{courseBest ? "%" : ""}</div>
                          <div className="text-[11px] font-bold text-white/65">أفضل درجة</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-xs font-black tracking-[.16em] text-[#B1785C]">أقسام الاختبار</div>
                        <h3 className="mt-1 text-xl font-black text-[#1F2B5E]">Grammar · Vocabulary · Reading</h3>
                      </div>
                      <div className="rounded-xl bg-[#f5f3f8] px-3 py-2 text-xs font-black text-[#686e84]">
                        30 دقيقة لكل قسم · 4 محاولات مستقلة · مراجعة الأخطاء بعد التسليم
                      </div>
                    </div>

                    {exams.length ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {exams.map((exam) => {
                          const now = Date.now();
                          const opensAt = new Date(exam.starts_at).getTime();
                          const closesAt = new Date(exam.ends_at).getTime();
                          const isOpen = now >= opensAt && now <= closesAt;
                          const isUpcoming = now < opensAt;
                          const examAttempts = data.attempts.filter((item) => item.exam_id === exam.id);
                          const latestAttempt = examAttempts[0];
                          const examResults = data.results.filter((item) => item.exam_id === exam.id);
                          const publishedResult = examResults[0];
                          const bestResult = [...examResults]
                            .filter((item) => item.percentage !== null)
                            .sort((a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0))[0];
                          const attemptsUsed = examAttempts.length;
                          const attemptsRemaining = Math.max(0, exam.attempts_allowed - attemptsUsed);
                          const examSections = data.sections.filter((section) => section.exam_id === exam.id);
                          const primarySection = examSections[0] ?? null;
                          const uniformSectionTime = examSections.length
                            ? examSections.every((section) => section.time_limit_minutes === examSections[0].time_limit_minutes)
                              ? examSections[0].time_limit_minutes
                              : null
                            : null;
                          const inProgress = latestAttempt?.status === "IN_PROGRESS" && isOpen;
                          const completed = Boolean(publishedResult);
                          const lockedOut = isOpen && attemptsRemaining === 0 && !inProgress;

                          const stateLabel = inProgress
                            ? "قيد المحاولة"
                            : completed
                              ? "المكتمل"
                              : isUpcoming
                                ? "قادم"
                                : !isOpen
                                  ? "مغلق"
                                  : lockedOut
                                    ? "اكتملت المحاولات"
                                    : "لم يبدأ";

                          const stateClass = inProgress
                            ? "bg-amber-50 text-amber-700"
                            : completed
                              ? "bg-emerald-50 text-emerald-700"
                              : isUpcoming
                                ? "bg-[#f1f2ff] text-[#565bc1]"
                                : !isOpen || lockedOut
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-[#fbf2ed] text-[#9a6249]";

                          return (
                            <article
                              key={exam.id}
                              className="group relative overflow-hidden rounded-[1.45rem] border border-[#e7e3eb] bg-white p-4 shadow-[0_10px_30px_rgba(31,43,94,.05)] transition hover:-translate-y-1 hover:border-[#cfc8da] hover:shadow-[0_18px_42px_rgba(31,43,94,.1)]"
                            >
                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1F2B5E] to-[#6366F1] text-lg font-black text-white shadow-lg">
                                  {primarySection?.title?.slice(0, 1) ?? <BookOpen size={20} />}
                                </div>
                                <span className={"rounded-full px-2.5 py-1 text-[11px] font-black " + stateClass}>
                                  {stateLabel}
                                </span>
                              </div>

                              <div dir="ltr" className="text-[11px] font-black tracking-[.12em] text-[#B1785C]">{exam.category}</div>
                              <h4 dir="ltr" className="mt-1 text-lg font-black leading-6 text-[#1F2B5E]">{primarySection?.title ?? exam.title}</h4>
                              <div dir="ltr" className="mt-1 min-h-[1.5rem] text-xs font-bold text-[#85899a]">{exam.title}</div>

                              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-[#f8f7fa] p-2.5">
                                  <div className="font-black text-[#1F2B5E]">
                                    {primarySection?.question_count ?? "—"} سؤال
                                  </div>
                                  <div className="mt-0.5 text-[#85899a]">{uniformSectionTime ?? 30} دقيقة</div>
                                </div>
                                <div className="rounded-xl bg-[#f8f7fa] p-2.5">
                                  <div className="font-black text-[#1F2B5E]">{attemptsRemaining} / {exam.attempts_allowed}</div>
                                  <div className="mt-0.5 text-[#85899a]">المحاولات المتبقية</div>
                                </div>
                              </div>

                              {bestResult ? (
                                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                                      <Award size={14} /> أفضل درجة
                                    </div>
                                    <div className="text-lg font-black text-emerald-800">{bestResult.percentage ?? 0}%</div>
                                  </div>
                                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: Math.max(0, Math.min(100, Number(bestResult.percentage ?? 0))) + "%" }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 rounded-xl border border-dashed border-[#ddd8e5] bg-[#fbfafc] p-3 text-xs leading-5 text-[#7a7f91]">
                                  تظهر النتيجة مباشرة بعد إنهاء هذا القسم، مع الأسئلة الخاطئة والإجابات الصحيحة.
                                </div>
                              )}

                              <div className="mt-3 grid grid-cols-4 gap-1.5">
                                {Array.from({ length: exam.attempts_allowed }, (_, slot) => {
                                  const attemptNumber = slot + 1;
                                  const attempt = examAttempts.find((item) => item.attempt_number === attemptNumber);
                                  const result = attempt ? examResults.find((item) => item.attempt_id === attempt.id) : null;
                                  const isCurrent = attempt?.status === "IN_PROGRESS";
                                  return (
                                    <div
                                      key={attemptNumber}
                                      className={
                                        "rounded-lg px-2 py-2 text-center text-[10px] font-black " +
                                        (result
                                          ? "bg-emerald-50 text-emerald-700"
                                          : isCurrent
                                            ? "bg-amber-50 text-amber-700"
                                            : attempt
                                              ? "bg-[#f3f1f7] text-[#767b8e]"
                                              : "bg-[#faf9fb] text-[#a0a3af]")
                                      }
                                    >
                                      <div>م{attemptNumber}</div>
                                      <div className="mt-0.5 text-[11px]">
                                        {result ? (result.percentage ?? 0) + "%" : isCurrent ? "جاري"  : attempt ? "تم" : "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {inProgress ? (
                                <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                                  <PlayCircle size={17} /> متابعة المحاولة {latestAttempt?.attempt_number}
                                </a>
                              ) : isOpen && attemptsRemaining > 0 ? (
                                <a href={"/exam/" + exam.id} className="btn mt-4 w-full">
                                  {attemptsUsed > 0 ? <RotateCcw size={17} /> : <PlayCircle size={17} />}
                                  {attemptsUsed > 0 ? "بدء محاولة جديدة" : "بدء القسم"}
                                </a>
                              ) : (
                                <div className="mt-4 flex min-h-[3.1rem] items-center justify-center rounded-xl bg-[#f3f1f7] px-3 text-center text-xs font-black text-[#777b8d]">
                                  {isUpcoming
                                    ? "يفتح في " + formatDate(exam.starts_at)
                                    : lockedOut
                                      ? "تم استخدام جميع المحاولات"
                                      : "هذا القسم مغلق"}
                                </div>
                              )}

                              {completed ? (
                                <a
                                  href={"/results/" + exam.id}
                                  className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-[#ddd8e5] bg-white px-3 text-xs font-black text-[#1F2B5E] transition hover:bg-[#f8f7fa]"
                                >
                                  عرض سجل النتائج
                                </a>
                              ) : null}

                              {completed ? (
                                <div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700">
                                  <CheckCircle2 size={14} />
                                  الأحدث: {publishedResult?.percentage ?? 0}% · {attemptsUsed} محاولة مستخدمة
                                </div>
                              ) : (
                                <div className="mt-3 text-[11px] font-bold text-[#9396a5]">
                                  {exam.total_marks} درجة · النتيجة تظهر مباشرة
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#f7f7fa] p-5 text-[#68708a]">
                        لا توجد اختبارات منشورة لهذه المادة حاليا.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {data.settings?.support_whatsapp || data.settings?.support_website ? (
          <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#e2dfeb] bg-white shadow-sm">
            <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="text-xs font-black text-[#B1785C]">دعم نمو</div>
                <h2 className="mt-1 text-xl font-black">تحتاج مساعدة في حسابك أو الاختبار؟</h2>
                <p className="mt-2 text-sm leading-7 text-[#68708a]">
                  تواصل مع فريق نمو للمساعدة في تسجيل الدخول أو الجهاز الموثوق أو الوصول للاختبارات.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.settings.support_whatsapp ? (
                  <a
                    href={data.settings.support_whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                  >
                    <MessageCircle size={17} /> الدعم عبر واتساب
                  </a>
                ) : null}
                {data.settings.support_website ? (
                  <a
                    href={data.settings.support_website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-[#ddd8e5] bg-white px-4 py-3 text-sm font-black"
                  >
                    الموقع الرسمي
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
