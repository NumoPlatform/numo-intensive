"use client";

import type { FormEvent } from "react";
import NumoBrand from "@/app/components/NumoBrand";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  default_cover_url: string | null;
  cover_path: string | null;
  is_active: boolean;
};
type Student = {
  id: string;
  full_name: string;
  username: string;
  status: string;
  start_date: string | null;
  expiration_date: string | null;
  last_login_at: string | null;
};
type Enrollment = { student_id: string; course_id: string; is_active: boolean };
type Device = {
  student_id: string;
  status: string;
  registered_at: string | null;
  last_access_at: string | null;
  reset_at: string | null;
};
type AuditLog = {
  id: number;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
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
  result_release: string;
};
type Section = {
  id: string;
  exam_id: string;
  title: string;
  position: number;
  marks: number;
  question_count: number | null;
  time_limit_minutes: number;
};
type Overview = {
  admin: { full_name: string; username: string };
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  devices: Device[];
  exams: Exam[];
  sections: Section[];
  audits: AuditLog[];
};

type Readiness = {
  ready: boolean;
  sections: number;
  questions: number;
  checks: {
    el111Course: boolean;
    threeIndependentSections: boolean;
    sectionQuestionCounts: boolean;
    fourAttemptsPerSection: boolean;
    immediateResults: boolean;
    liveSections: boolean;
    thirtyMinuteSections: boolean;
    oneSectionPerAssessment: boolean;
    answerReviewEnabled: boolean;
    assignedToCourse: boolean;
    autoGradedQuestions: boolean;
    answerKeysValid: boolean;
    baseExamRpcsLocked: boolean;
    sectionedRpcsAvailable: boolean;
    answerKeyTablesRls: boolean;
    legacyBootstrapRemoved: boolean;
    riyadhAccessWindows: boolean;
    publicSchemaFkIsolated: boolean;
    functionNamespaceIsolated: boolean;
    coverStorageLockedDown: boolean;
    examDuplicationAvailable: boolean;
  };
};

type Tab = "dashboard" | "students" | "exams" | "questions";

const initialStudent = {
  fullName: "",
  username: "",
  password: "",
  courseIds: [] as string[],
  startDate: "",
  expirationDate: "",
};

const initialExam = {
  courseId: "",
  title: "",
  category: "QUIZ 1",
  description: "",
  startsAt: "",
  endsAt: "",
  durationMinutes: 90,
  sectionDurationMinutes: 30,
  attemptsAllowed: 4,
  resultRelease: "IMMEDIATE",
  skills: ["Grammar", "Vocabulary", "Reading"],
};

const initialQuestion = {
  examId: "",
  sectionId: "",
  type: "MULTIPLE_CHOICE",
  prompt: "",
  marks: 1,
  difficulty: "MEDIUM",
  correctBoolean: true,
  gradingMode: "AUTO",
  acceptableAnswers: "",
  passageTitle: "",
  passageBody: "",
  options: [
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ],
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function riyadhLocalToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? trimmed + ":00"
    : trimmed;
  return new Date(withSeconds + "+03:00").toISOString();
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE_STUDENT: "إنشاء حساب طالب",
    UPDATE_STUDENT: "تحديث حساب طالب",
    RESET_DEVICE: "إعادة ضبط جهاز",
    CREATE_EXAM: "إنشاء اختبار",
    UPDATE_EXAM: "تحديث اختبار",
    ARCHIVE_EXAM: "أرشفة اختبار",
    RESTORE_EXAM: "استعادة اختبار",
    DUPLICATE_EXAM: "نسخ اختبار",
    ADD_QUESTION: "إضافة سؤال",
    UPDATE_QUESTION: "تحديث سؤال",
    REMOVE_QUESTION: "إزالة سؤال",
    EXPORT_RESULTS: "تصدير النتائج",
    UPDATE_COURSE: "تحديث إعدادات مقرر",
    UPDATE_SETTINGS: "تحديث إعدادات النظام",
    UPDATE_COURSE_COVER: "تحديث غلاف مادة",
    UPLOAD_COURSE_COVER: "رفع غلاف مادة",
    FINALIZE_GRADING: "اعتماد التصحيح",
    PUBLISH_RESULT: "نشر نتيجة",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="deluxe-panel min-w-0 overflow-hidden rounded-[1.25rem] p-3.5 sm:rounded-[2rem] sm:p-6">
      <div className="mb-5 flex items-start gap-3 sm:mb-6">
        <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#c48566] to-[#8f573f]" />
        <div className="min-w-0">
          <h2 className="break-words text-lg font-black text-[#182553] sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-7 text-[#73788d]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminPortal() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<Overview | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [studentForm, setStudentForm] = useState(initialStudent);
  const [examForm, setExamForm] = useState(initialExam);
  const [questionForm, setQuestionForm] = useState(initialQuestion);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [response, readinessResponse] = await Promise.all([
      intensiveFetch("/api/admin/overview", { cache: "no-store" }),
      intensiveFetch("/api/admin/readiness", { cache: "no-store" }),
    ]);

    const payload = await response.json();
    if (response.status === 401 || response.status === 403) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) throw new Error(payload.message || "تعذر تحميل لوحة تحكم المدير.");

    setData(payload);

    if (readinessResponse.ok) {
      const readinessPayload = await readinessResponse.json();
      setReadiness(readinessPayload);
    } else {
      setReadiness(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setNotice({ type: "error", text: "تعذر تحميل بيانات لوحة التحكم." });
      setLoading(false);
    });
  }, []);

  const courseMap = useMemo(
    () => new Map((data?.courses ?? []).map((course) => [course.id, course])),
    [data],
  );

  const deviceMap = useMemo(
    () => new Map((data?.devices ?? []).map((device) => [device.student_id, device])),
    [data],
  );

  const sectionsForQuestion = useMemo(
    () => (data?.sections ?? []).filter((section) => section.exam_id === questionForm.examId),
    [data, questionForm.examId],
  );

  const selectedSection = sectionsForQuestion.find((section) => section.id === questionForm.sectionId);

  const enrolledCodes = (studentId: string) =>
    (data?.enrollments ?? [])
      .filter((item) => item.student_id === studentId && item.is_active)
      .map((item) => courseMap.get(item.course_id)?.code)
      .filter(Boolean)
      .join(",  ");

  function toggleCourse(courseId: string) {
    setStudentForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await intensiveFetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إنشاء حساب الطالب.");
      setStudentForm(initialStudent);
      setNotice({ type: "success", text: "تم إنشاء حساب الطالب وتسجيله في المواد بنجاح." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "تعذر إنشاء حساب الطالب." });
    } finally {
      setSubmitting(false);
    }
  }

  async function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await intensiveFetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...examForm,
          durationMinutes: examForm.sectionDurationMinutes * examForm.skills.length,
          startsAt: examForm.startsAt ? riyadhLocalToIso(examForm.startsAt) : "",
          endsAt: examForm.endsAt ? riyadhLocalToIso(examForm.endsAt) : "",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إنشاء الاختبار.");
      const createdId = payload.result?.exam_id || "";
      setExamForm(initialExam);
      setQuestionForm((current) => ({ ...current, examId: createdId, sectionId: "" }));
      setNotice({ type: "success", text: "تم إنشاء الاختبار وإسناده لطلاب المادة بنجاح." });
      await load();
      setTab("questions");
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "تعذر إنشاء الاختبار." });
    } finally {
      setSubmitting(false);
    }
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await intensiveFetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionForm,
          skill: selectedSection?.title || "",
          acceptableAnswers: questionForm.acceptableAnswers
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إضافة السؤال.");
      setQuestionForm((current) => ({
        ...initialQuestion,
        examId: current.examId,
        sectionId: current.sectionId,
      }));
      setNotice({ type: "success", text: "تمت إضافة السؤال بنجاح." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "تعذر إضافة السؤال." });
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/");
  }

  if (loading) {
    return (
      <div className="deluxe-canvas grid min-h-screen place-items-center px-5 text-[#1F2B5E]">
        <div className="deluxe-panel w-full max-w-sm rounded-[2rem] p-8 text-center">
          <NumoBrand className="w-28" priority />
          <RefreshCw className="mx-auto mb-4 mt-6 animate-spin text-[#b97b5d]" />
          <div className="font-black">جاري تجهيز مركز التحكم...</div>
          <div className="mt-1 text-xs font-bold text-[#85899a]">NUMO DELUXE ADMIN</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const navItems: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { id: "students", label: "الطلاب", icon: UsersRound },
    { id: "exams", label: "الاختبارات", icon: CalendarClock },
    { id: "questions", label: "منشئ الأسئلة", icon: ClipboardList },
  ];

  const adminLinks: Array<{ href: string; label: string; icon: typeof LayoutDashboard }> = [
    { href: "/admin/courses", label: "إدارة المقررات", icon: BookOpenCheck },
    { href: "/admin/exams/new", label: "إنشاء اختبار جديد", icon: CalendarClock },
    { href: "/admin/question-bank", label: "بنك الأسئلة", icon: ClipboardList },
    { href: "/admin/grading", label: "التصحيح والنتائج", icon: CheckCircle2 },
    { href: "/admin/analytics", label: "التحليلات", icon: LayoutDashboard },
    { href: "/admin/covers", label: "أغلفة المقررات", icon: BookOpenCheck },
    { href: "/admin/settings", label: "إعدادات النظام", icon: ShieldCheck },
  ];

  return (
    <div className="admin-shell deluxe-canvas min-h-screen overflow-x-clip text-[#182553]">
      <div className="min-h-screen lg:grid lg:grid-cols-[296px_minmax(0,1fr)]">
        <aside className="deluxe-sidebar relative hidden h-screen overflow-hidden p-5 text-white lg:sticky lg:top-0 lg:flex lg:flex-col lg:p-6">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#c48566]/18 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#5b6ca7]/18 blur-3xl" />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mb-7 flex justify-center rounded-[1.65rem] border border-white/10 bg-white/[.06] p-4 shadow-2xl shadow-black/10">
              <NumoBrand className="w-32" priority inverse />
            </div>

            <div className="mb-3 px-3 text-[10px] font-black tracking-[.18em] text-white/40">مساحة العمل</div>
            <nav className="grid gap-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={
                    "group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-black transition duration-200 " +
                    (tab === id
                      ? "bg-white text-[#182553] shadow-[0_14px_32px_rgba(7,12,39,.22)]"
                      : "border border-white/[.07] bg-white/[.035] text-white/70 hover:border-white/15 hover:bg-white/[.08] hover:text-white")
                  }
                >
                  <span className={"grid h-8 w-8 place-items-center rounded-xl transition " + (tab === id ? "bg-[#f3ece8] text-[#a9684c]" : "bg-white/[.06]")}>
                    <Icon size={17} />
                  </span>
                  {label}
                </button>
              ))}
            </nav>

            <div className="my-5 border-t border-white/[.08]" />
            <div className="mb-2 px-3 text-[10px] font-black tracking-[.18em] text-white/40">أدوات متقدمة</div>
            <nav className="deluxe-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pl-1">
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-right text-xs font-black text-white/60 transition hover:bg-white/[.07] hover:text-white"
                >
                  <Icon size={16} className="text-[#d59a7e]" />
                  {label}
                </a>
              ))}
            </nav>

            <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.04] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d9a087] to-[#9b5b40] text-sm font-black text-white">
                  {data.admin.full_name.trim().slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{data.admin.full_name}</div>
                  <div className="truncate text-[11px] text-white/45" dir="ltr">@{data.admin.username}</div>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.08] px-4 py-2.5 text-xs font-black text-white/55 transition hover:bg-white/[.06] hover:text-white"
            >
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </aside>

        <main className="min-w-0 max-w-full px-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-3 sm:px-5 sm:pb-10 sm:pt-5 lg:p-8 lg:pb-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-3 flex items-center justify-between rounded-[1.35rem] border border-white/80 bg-white/80 p-3 shadow-[0_12px_35px_rgba(31,43,94,.07)] backdrop-blur-xl lg:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <NumoBrand className="w-[4.6rem]" priority />
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">مركز تحكم نمو</div>
                  <div className="truncate text-[10px] font-bold tracking-[.12em] text-[#a9684c]" dir="ltr">DELUXE ADMIN</div>
                </div>
              </div>
              <button onClick={logout} aria-label="تسجيل الخروج" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4efec] text-[#8f573f]">
                <LogOut size={17} />
              </button>
            </div>

            <nav
              aria-label="أقسام لوحة التحكم"
              className="admin-mobile-tabs sticky top-[max(.5rem,env(safe-area-inset-top))] z-40 mb-3 grid grid-cols-4 gap-1 rounded-[1.25rem] border border-white/80 bg-[#17214d]/95 p-1.5 text-white shadow-[0_14px_38px_rgba(16,27,69,.24)] backdrop-blur-xl lg:hidden"
            >
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={
                    "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[.9rem] px-1 text-[9px] font-black leading-tight transition sm:min-h-13 sm:text-[10px] " +
                    (tab === id ? "bg-white text-[#182553] shadow-md" : "text-white/60")
                  }
                >
                  <Icon size={17} className={tab === id ? "text-[#ad6b4e]" : ""} />
                  <span className="max-w-full truncate">{label}</span>
                </button>
              ))}
            </nav>

            <header className={"deluxe-hero relative mb-4 overflow-hidden rounded-[1.75rem] p-4 text-white shadow-[0_24px_70px_rgba(18,31,76,.24)] sm:mb-6 sm:rounded-[2.2rem] sm:p-8 " + (tab === "dashboard" ? "" : "hidden lg:block")}>
              <div className="deluxe-orbit deluxe-orbit-one" />
              <div className="deluxe-orbit deluxe-orbit-two" />
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-3 py-1.5 text-[10px] font-black text-[#efc8b5] backdrop-blur sm:text-xs">
                    <Sparkles size={14} /> NUMO DELUXE CONTROL CENTER
                  </div>
                  <p className="text-xs font-bold text-white/55">أهلًا بك، {data.admin.full_name.split(" ")[0]}</p>
                  <h1 className="mt-1 text-2xl font-black leading-tight sm:text-4xl">كل المنصة. رؤية واحدة.</h1>
                  <p className="mt-3 max-w-2xl text-xs leading-6 text-white/65 sm:text-sm sm:leading-7">
                    إدارة ذكية للطلاب والمقررات والاختبارات والنتائج بهوية نمو الرسمية.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <a href="/admin/exams/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#182553] shadow-xl shadow-black/10 transition hover:-translate-y-0.5">
                    <Plus size={16} /> اختبار جديد
                  </a>
                  <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.08] px-4 py-2.5 text-xs font-black text-white/80 backdrop-blur">
                    <ShieldCheck size={16} className="text-[#edc1aa]" /> النظام آمن
                  </div>
                </div>
              </div>
            </header>

            <div className={"deluxe-scrollbar mb-4 gap-2 overflow-x-auto pb-1 lg:hidden " + (tab === "dashboard" ? "flex" : "hidden")}>
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <a key={href} href={href} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#e9e1dc] bg-white/90 px-3.5 text-xs font-black text-[#27335f] shadow-sm">
                  <Icon size={15} className="text-[#ad6b4e]" /> {label}
                </a>
              ))}
            </div>

            {notice ? (
              <div
                className={
                  "mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold " +
                  (notice.type === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-rose-100 bg-rose-50 text-rose-800")
                }
              >
                {notice.type === "success" ? <CheckCircle2 size={19} /> : <ShieldCheck size={19} />}
                <span>{notice.text}</span>
              </div>
            ) : null}

            {tab === "dashboard" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                  {[
                    { label: "الطلاب", value: data.students.length, icon: UsersRound, accent: "#0878E8", soft: "#EAF3FF" },
                    { label: "المقررات", value: data.courses.filter((item) => item.is_active).length, icon: BookOpenCheck, accent: "#009CA6", soft: "#E7F9F9" },
                    { label: "الاختبارات", value: data.exams.length, icon: CalendarClock, accent: "#BC247D", soft: "#FCEAF5" },
                    { label: "الأسئلة", value: data.sections.reduce((sum, item) => sum + (item.question_count || 0), 0), icon: ClipboardList, accent: "#F07F00", soft: "#FFF2DF" },
                  ].map(({ label, value, icon: Icon, accent, soft }) => (
                    <div key={label} className="deluxe-stat-card relative overflow-hidden rounded-[1.4rem] p-4 sm:rounded-[1.7rem] sm:p-5">
                      <div className="absolute -left-7 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: accent }} />
                      <div className="relative mb-5 flex items-center justify-between sm:mb-6">
                        <div className="grid h-10 w-10 place-items-center rounded-xl sm:h-11 sm:w-11" style={{ backgroundColor: soft, color: accent }}>
                          <Icon size={21} />
                        </div>
                        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
                      </div>
                      <div className="relative text-3xl font-black tracking-tight sm:text-4xl">{value}</div>
                      <div className="relative mt-1 text-xs font-bold text-[#74798d] sm:text-sm">{label}</div>
                    </div>
                  ))}
                </div>

                <Panel
                  title="إدارة المقررات"
                  subtitle="كل مقرر يظهر بهويته الخاصة مع وصول سريع إلى الطلاب والاختبارات والغلاف."
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {data.courses.map((course) => {
                      const visual = courseVisual(course.code);
                      const studentCount = data.enrollments.filter((item) => item.course_id === course.id && item.is_active).length;
                      const examCount = data.exams.filter((exam) => exam.course_id === course.id).length;
                      return (
                        <article key={course.id} className="group overflow-hidden rounded-[1.55rem] border border-black/[.06] bg-white shadow-[0_14px_38px_rgba(31,43,94,.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_55px_rgba(31,43,94,.15)]">
                          <div className="relative h-52 overflow-hidden sm:h-56 2xl:h-48">
                            <img
                              src={courseCover(course.code, course.default_cover_url)}
                              alt={"غلاف " + course.code}
                              className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.035]"
                              onError={(event) => {
                                const fallback = courseVisual(course.code).cover;
                                if (event.currentTarget.src.endsWith(fallback)) {
                                  event.currentTarget.style.display = "none";
                                  return;
                                }
                                event.currentTarget.src = fallback;
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111c48]/90 via-transparent to-black/5" />
                            <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: visual.gradient }} />
                            <span className="absolute bottom-4 right-3 rounded-full border border-white/60 bg-white/95 px-3 py-1 text-[11px] font-black shadow-lg" style={{ color: visual.accentDark }}>{visual.level}</span>
                            <span className={"absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black " + (course.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                              {course.is_active ? "نشط" : "غير نشط"}
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div dir="ltr" className="text-lg font-black text-[#182553]">{course.code}</div>
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: visual.accent, boxShadow: `0 0 0 4px ${visual.accentSoft}` }} />
                            </div>
                            <div className="mt-1 text-xs font-bold text-[#777c8f]">{visual.label}</div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                              <div className="rounded-xl p-2" style={{ backgroundColor: visual.accentSoft }}>
                                <div className="text-lg font-black text-[#1F2B5E]">{studentCount}</div>
                                <div className="text-[10px] font-bold text-[#8a8e9f]">طالب</div>
                              </div>
                              <div className="rounded-xl p-2" style={{ backgroundColor: visual.accentSoft }}>
                                <div className="text-lg font-black text-[#1F2B5E]">{examCount}</div>
                                <div className="text-[10px] font-bold text-[#8a8e9f]">اختبار</div>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <a href="/admin/courses" className="rounded-xl px-3 py-2.5 text-center text-xs font-black text-white shadow-sm" style={{ background: visual.gradient }}>إدارة المقرر</a>
                              <a href="/admin/covers" className="rounded-xl border border-[#ded9e5] bg-white px-3 py-2.5 text-center text-xs font-black text-[#1F2B5E]">الغلاف</a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </Panel>

                <Panel
                  title="مركز التحكم السريع"
                  subtitle="وصول مباشر لكل تفاصيل المنصة دون البحث بين الصفحات."
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { title: "إدارة الطلاب", note: "الحسابات، التسجيل، حالة الجهاز", action: () => setTab("students"), tone: "#6366F1" },
                      { title: "إنشاء الاختبارات", note: "المواعيد، المحاولات، الأقسام", action: () => setTab("exams"), tone: "#1F2B5E" },
                      { title: "إضافة الأسئلة", note: "Grammar · Vocabulary · Reading", action: () => setTab("questions"), tone: "#B1785C" },
                    ].map((item) => (
                      <button key={item.title} type="button" onClick={item.action} className="rounded-2xl border border-[#e7e3eb] bg-[#faf9fb] p-4 text-right transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                        <div className="mb-3 h-1.5 w-12 rounded-full" style={{backgroundColor:item.tone}} />
                        <div className="font-black text-[#1F2B5E]">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-[#818596]">{item.note}</div>
                      </button>
                    ))}
                    <a href="/admin/grading" className="rounded-2xl border border-[#e7e3eb] bg-[#faf9fb] p-4 text-right transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                      <div className="mb-3 h-1.5 w-12 rounded-full bg-emerald-500" />
                      <div className="font-black text-[#1F2B5E]">التصحيح والنتائج</div>
                      <div className="mt-1 text-xs leading-5 text-[#818596]">اعتماد النتائج ومراجعة الكتابي</div>
                    </a>
                  </div>
                </Panel>

                <Panel
                  title="متابعة سريعة"
                  subtitle="أهم الحالات التي يفضل أن يراجعها المدير قبل بدء الاختبارات."
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "حسابات تحتاج مراجعة",
                        value: data.students.filter((student) => student.status !== "ACTIVE").length,
                        note: "موقوفة أو منتهية",
                      },
                      {
                        label: "أجهزة تحتاج متابعة",
                        value: data.students.filter((student) => deviceMap.get(student.id)?.status !== "ACTIVE").length,
                        note: "غير مسجلة أو تمت إعادة ضبطها",
                      },
                      {
                        label: "اختبارات LIVE",
                        value: data.exams.filter((exam) => exam.status === "LIVE").length,
                        note: "اختبارات متاحة للطلاب",
                      },
                      {
                        label: "أغلفة غير مكتملة",
                        value: data.courses.filter((course) => !course.default_cover_url && !course.cover_path).length,
                        note: "مواد تحتاج غلافا",
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-[#ebe7ef] bg-[#faf9fb] p-4">
                        <div className="text-xs font-black text-[#777b8d]">{item.label}</div>
                        <div className="mt-1 text-3xl font-black text-[#1F2B5E]">{item.value}</div>
                        <div className="mt-1 text-xs leading-5 text-[#8b8f9f]">{item.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>

                {readiness ? (
                  <div className={
                    "rounded-[1.6rem] border p-5 shadow-sm " +
                    (readiness.ready
                      ? "border-emerald-100 bg-gradient-to-r from-emerald-50 to-white"
                      : "border-amber-100 bg-gradient-to-r from-amber-50 to-white")
                  }>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-black tracking-[.14em] text-[#B1785C]">جاهزية النظام المستقل</div>
                        <h2 className="mt-1 text-xl font-black">
                          {readiness.ready ? "أقسام EL111 الثلاثة جاهزة" : "هناك عناصر تحتاج مراجعة قبل النشر"}
                        </h2>
                        <p className="mt-1 text-sm text-[#74798d]">
                          تم التحقق من {readiness.sections} أقسام و{readiness.questions} سؤالا من ملف EL111 المعتمد.
                        </p>
                      </div>
                      <span className={
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black " +
                        (readiness.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")
                      }>
                        <ShieldCheck size={15} />
                        {readiness.ready ? "جاهز" : "بحاجة للمراجعة"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ["3 أقسام مستقلة", readiness.checks.threeIndependentSections],
                        ["4 محاولات لكل قسم", readiness.checks.fourAttemptsPerSection],
                        ["نتيجة مباشرة", readiness.checks.immediateResults],
                        ["30 دقيقة لكل قسم", readiness.checks.thirtyMinuteSections],
                        ["132 سؤالا من الملف", readiness.checks.sectionQuestionCounts],
                        ["قسم واحد لكل محاولة", readiness.checks.oneSectionPerAssessment],
                        ["مراجعة الأخطاء مفعلة", readiness.checks.answerReviewEnabled],
                        ["مسندة إلى EL111", readiness.checks.assignedToCourse],
                        ["تصحيح تلقائي", readiness.checks.autoGradedQuestions],
                        ["مفاتيح الإجابة سليمة", readiness.checks.answerKeysValid],
                        ["دوال الأساس محمية", readiness.checks.baseExamRpcsLocked],
                        ["دوال الأقسام جاهزة", readiness.checks.sectionedRpcsAvailable],
                        ["حماية مفاتيح الإجابة", readiness.checks.answerKeyTablesRls],
                        ["تواريخ الدخول بتوقيت الرياض", readiness.checks.riyadhAccessWindows],
                        ["قاعدة البيانات معزولة", readiness.checks.publicSchemaFkIsolated],
                        ["الدوال معزولة", readiness.checks.functionNamespaceIsolated],
                        ["تخزين الأغلفة محمي", readiness.checks.coverStorageLockedDown],
                        ["نسخ الاختبارات جاهز", readiness.checks.examDuplicationAvailable],
                      ].map(([label, ok]) => (
                        <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-black">
                          <CheckCircle2 size={15} className={ok ? "text-emerald-600" : "text-amber-500"} />
                          <span>{String(label)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                  <Panel title="أحدث الاختبارات" subtitle="أحدث الاختبارات التي تم إنشاؤها.">
                    <div className="space-y-3">
                      {data.exams.slice(0, 6).map((exam) => (
                        <div key={exam.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ece9f0] p-4">
                          <div>
                            <div className="text-xs font-black text-[#B1785C]">
                              {courseMap.get(exam.course_id)?.code} · {exam.category}
                            </div>
                            <div className="mt-1 font-black">{exam.title}</div>
                          </div>
                          <div className="text-left text-xs leading-6 text-[#74798d]">
                            <div>{formatDate(exam.starts_at)}</div>
                            <div>{exam.duration_minutes} min · {exam.total_marks} درجة</div>
                          </div>
                        </div>
                      ))}
                      {data.exams.length === 0 ? <div className="rounded-xl bg-[#f7f7fa] p-5 text-[#777b8d]">لا توجد اختبارات حتى الآن.</div> : null}
                    </div>
                  </Panel>

                  <Panel title="حالة أغلفة المواد" subtitle="إدارة صورة الغلاف لكل مادة.">
                    <div className="space-y-3">
                      {data.courses.map((course) => {
                        const ready = Boolean(course.default_cover_url || course.cover_path);
                        return (
                          <div key={course.id} className="flex items-center justify-between rounded-2xl border border-[#ece9f0] p-4">
                            <div>
                              <div dir="ltr" className="font-black">{course.code}</div>
                              <div dir="ltr" className="mt-1 text-xs text-[#777b8d]">{course.title}</div>
                            </div>
                            <span className={
                              "rounded-full px-3 py-1 text-xs font-black " +
                              (ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
                            }>
                              {ready ? "الغلاف جاهز" : "بحاجة لغلاف"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>

                <div className="mt-6">
                  <Panel title="آخر نشاطات الإدارة" subtitle="يتم تسجيل تغييرات الأمان وعمليات المحتوى تلقائيا.">
                    <div className="space-y-2">
                      {data.audits.slice(0, 10).map((audit) => (
                        <div key={audit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ece9f0] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f2ff] text-[#6366F1]">
                              <ClipboardList size={17} />
                            </div>
                            <div>
                              <div className="text-sm font-black">{auditLabel(audit.action)}</div>
                              <div className="mt-0.5 text-xs text-[#85899a]">{audit.target_type}{audit.target_id ? " · " + audit.target_id.slice(0, 10) : ""}</div>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-[#85899a]">{formatDate(audit.created_at)}</div>
                        </div>
                      ))}
                      {data.audits.length === 0 ? (
                        <div className="rounded-xl bg-[#f7f7fa] p-5 text-[#777b8d]">لا يوجد نشاط إداري مسجل حتى الآن.</div>
                      ) : null}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}

            {tab === "students" ? (
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(320px,.78fr)_minmax(0,1.22fr)] lg:gap-6">
                <Panel title="إضافة طالب" subtitle="أنشئ بيانات دخول الطالب وحدد المواد المسجلة له.">
                  <form onSubmit={createStudent} className="min-w-0 space-y-4 sm:space-y-5">
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">اسم الطالب</span>
                      <input className="field" required value={studentForm.fullName} onChange={(e)=>setStudentForm({...studentForm,fullName:e.target.value})} />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">اسم المستخدم</span>
                        <input className="field" dir="ltr" required value={studentForm.username} onChange={(e)=>setStudentForm({...studentForm,username:e.target.value})} />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">كلمة المرور</span>
                        <input className="field" dir="ltr" type="password" autoComplete="new-password" minLength={8} required value={studentForm.password} onChange={(e)=>setStudentForm({...studentForm,password:e.target.value})} />
                      </label>
                    </div>
                    <div>
                      <span className="mb-2 block text-sm font-black">المواد</span>
                      <div className="deluxe-scrollbar grid max-h-[18rem] min-w-0 gap-2 overflow-y-auto rounded-2xl border border-[#ebe7ef] bg-[#faf9fb] p-2 md:grid-cols-2 sm:p-3">
                        {data.courses.filter((course)=>course.is_active).map((course) => (
                          <label key={course.id} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[#e5e1e9] bg-white p-3 shadow-sm">
                            <input type="checkbox" checked={studentForm.courseIds.includes(course.id)} onChange={()=>toggleCourse(course.id)} />
                            <span className="min-w-0"><strong className="block">{course.code}</strong><small className="block break-words text-[#777b8d]">{course.title}</small></span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">تاريخ البداية</span>
                        <input className="field" type="date" value={studentForm.startDate} onChange={(e)=>setStudentForm({...studentForm,startDate:e.target.value})} />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">تاريخ الانتهاء</span>
                        <input className="field" type="date" value={studentForm.expirationDate} onChange={(e)=>setStudentForm({...studentForm,expirationDate:e.target.value})} />
                      </label>
                    </div>
                    <button className="btn w-full" disabled={submitting}>
                      <UserPlus size={18} /> {submitting ? "جاري الإنشاء..." : "إنشاء حساب الطالب"}
                    </button>
                  </form>
                </Panel>

                <Panel title="الطلاب المسجلون" subtitle="إدارة الحسابات والمواد المسجلة والأجهزة الموثوقة.">
                  <div className="space-y-3 md:hidden">
                    {data.students.map((student) => (
                      <article key={student.id} className="rounded-2xl border border-[#e9e5ee] bg-white p-4 shadow-[0_10px_28px_rgba(31,43,94,.055)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="break-words text-base font-black text-[#182553]">{student.full_name}</div>
                            <div className="mt-1 truncate text-xs font-bold text-[#7a7f91]" dir="ltr">@{student.username}</div>
                          </div>
                          <span className={
                            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black " +
                            (student.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : student.status === "SUSPENDED"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700")
                          }>
                            {student.status}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-[#f8f7fa] p-3">
                            <div className="font-black text-[#73788d]">المواد</div>
                            <div className="mt-1 break-words font-bold text-[#182553]">{enrolledCodes(student.id) || "—"}</div>
                          </div>
                          <div className="rounded-xl bg-[#f8f7fa] p-3">
                            <div className="font-black text-[#73788d]">الانتهاء</div>
                            <div className="mt-1 font-bold text-[#182553]">{formatDate(student.expiration_date)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className={
                            "rounded-full px-2.5 py-1 text-[10px] font-black " +
                            (deviceMap.get(student.id)?.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : deviceMap.get(student.id)?.status === "RESET"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500")
                          }>
                            {deviceMap.get(student.id)?.status ?? "لا يوجد جهاز"}
                          </span>
                          <a href={"/admin/students/" + student.id} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#1F2B5E] px-4 text-xs font-black text-white">
                            إدارة الطالب
                          </a>
                        </div>
                      </article>
                    ))}
                    {data.students.length === 0 ? <div className="rounded-2xl bg-[#f7f7fa] py-8 text-center text-sm text-[#777b8d]">لم تتم إضافة طلاب حتى الآن.</div> : null}
                  </div>

                  <div className="-mx-1 hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-[#ece8ef] bg-white p-1 [scrollbar-width:thin] md:block">
                    <table className="w-full min-w-[760px] text-right text-sm">
                      <thead>
                        <tr className="border-b border-[#e8e4ec] text-[#777b8d]">
                          <th className="px-3 py-3 font-black">الطالب</th>
                          <th className="px-3 py-3 font-black">اسم المستخدم</th>
                          <th className="px-3 py-3 font-black">المادة</th>
                          <th className="px-3 py-3 font-black">تاريخ الانتهاء</th>
                          <th className="px-3 py-3 font-black">الحالة</th>
                          <th className="px-3 py-3 font-black">الجهاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((student) => (
                          <tr key={student.id} className="border-b border-[#f0edf2]">
                            <td className="px-3 py-4 font-black">{student.full_name}</td>
                            <td className="px-3 py-4" dir="ltr">{student.username}</td>
                            <td className="px-3 py-4">{enrolledCodes(student.id) || "—"}</td>
                            <td className="px-3 py-4">{formatDate(student.expiration_date)}</td>
                            <td className="px-3 py-4">
                              <span className={
                                "rounded-full px-2.5 py-1 text-xs font-black " +
                                (student.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : student.status === "SUSPENDED"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-700")
                              }>
                                {student.status}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={
                                  "rounded-full px-2.5 py-1 text-[11px] font-black " +
                                  (deviceMap.get(student.id)?.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : deviceMap.get(student.id)?.status === "RESET"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-slate-100 text-slate-500")
                                }>
                                  {deviceMap.get(student.id)?.status ?? "لا يوجد جهاز"}
                                </span>
                                <a href={"/admin/students/" + student.id} className="inline-flex items-center gap-2 rounded-lg border border-[#ddd8e5] bg-white px-3 py-2 text-xs font-black hover:bg-[#f8f6fa]">
                                  Manage
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.students.length === 0 ? <div className="py-10 text-center text-[#777b8d]">لم تتم إضافة طلاب حتى الآن.</div> : null}
                  </div>
                </Panel>
              </div>
            ) : null}

            {tab === "exams" ? (
              <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
                <Panel title="إنشاء اختبار" subtitle="يتم إنشاء الأقسام تلقائيا وإسناد الاختبار لطلاب المادة.">
                  <form onSubmit={createExam} className="space-y-4">
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">المادة</span>
                      <select className="field" required value={examForm.courseId} onChange={(e)=>setExamForm({...examForm,courseId:e.target.value})}>
                        <option value="">اختر المادة</option>
                        {data.courses.filter((course)=>course.is_active).map((course)=><option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}
                      </select>
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">اسم الاختبار</span>
                        <input className="field" required value={examForm.title} onChange={(e)=>setExamForm({...examForm,title:e.target.value})}/>
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">التصنيف</span>
                        <select className="field" value={examForm.category} onChange={(e)=>setExamForm({...examForm,category:e.target.value})}>
                          {["QUIZ 1","QUIZ 2","MIDTERM","FINAL","MOCK EXAM","PRACTICE EXAM","CUSTOM"].map((item)=><option key={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">وصف اختياري</span>
                      <textarea className="field min-h-24" value={examForm.description} onChange={(e)=>setExamForm({...examForm,description:e.target.value})}/>
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">يفتح في</span><input className="field" type="datetime-local" required value={examForm.startsAt} onChange={(e)=>setExamForm({...examForm,startsAt:e.target.value})}/></label>
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">يغلق في</span><input className="field" type="datetime-local" required value={examForm.endsAt} onChange={(e)=>setExamForm({...examForm,endsAt:e.target.value})}/></label>
                    </div>
                    <div className="rounded-xl bg-[#f8f7fa] px-3 py-2 text-xs font-bold text-[#777b8d]">
                      جميع الأوقات تعتمد توقيت الرياض (UTC+3) بغض النظر عن موقع المدير.
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-black">الدقائق لكل قسم</span>
                        <input className="field" type="number" min={1} max={240} value={examForm.sectionDurationMinutes} onChange={(e)=>setExamForm({...examForm,sectionDurationMinutes:Number(e.target.value)})}/>
                        <span className="mt-1 block text-xs text-[#777b8d]">الإجمالي: {examForm.sectionDurationMinutes * examForm.skills.length} دقيقة</span>
                      </label>
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">عدد المحاولات</span><input className="field" type="number" min={1} max={20} value={examForm.attemptsAllowed} onChange={(e)=>setExamForm({...examForm,attemptsAllowed:Number(e.target.value)})}/></label>
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">إظهار النتيجة</span><select className="field" value={examForm.resultRelease} onChange={(e)=>setExamForm({...examForm,resultRelease:e.target.value})}><option value="MANUAL">يدوي</option><option value="IMMEDIATE">مباشر</option><option value="AFTER_END">بعد الإغلاق</option></select></label>
                    </div>
                    <div>
                      <span className="mb-2 block text-sm font-black">الأقسام</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {examForm.skills.map((skill,index)=>(
                          <input key={index} className="field" required value={skill} onChange={(e)=>setExamForm({...examForm,skills:examForm.skills.map((item,i)=>i===index?e.target.value:item)})}/>
                        ))}
                      </div>
                    </div>
                    <button className="btn w-full" disabled={submitting}><Plus size={18}/> {submitting?"جاري الإنشاء...":"إنشاء الاختبار"}</button>
                  </form>
                </Panel>

                <Panel title="الاختبارات الحالية" subtitle="يتم تحديث الأقسام والدرجات تلقائيا عند إضافة الأسئلة.">
                  <div className="space-y-4">
                    {data.exams.map((exam)=>{
                      const sections=data.sections.filter((item)=>item.exam_id===exam.id);
                      return (
                        <article key={exam.id} className="rounded-2xl border border-[#e9e5ee] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-black text-[#B1785C]">{courseMap.get(exam.course_id)?.code} · {exam.category}</div>
                              <h3 dir="ltr" className="mt-1 text-lg font-black">{exam.title}</h3>
                              <p className="mt-2 text-xs leading-6 text-[#777b8d]">{formatDate(exam.starts_at)} — {formatDate(exam.ends_at)}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                                <span className="rounded-full bg-[#f1f2ff] px-2.5 py-1 text-[#4f54b8]">{exam.attempts_allowed} محاولات</span>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{exam.result_release === "IMMEDIATE" ? "نتيجة مباشرة" : exam.result_release}</span>
                              </div>
                            </div>
                            <div className="rounded-xl bg-[#f2f2ff] px-3 py-2 text-sm font-black">{exam.total_marks} درجة</div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {sections.map((section)=>(
                              <div key={section.id} className="rounded-xl bg-[#f8f7fa] px-3 py-2 text-sm">
                                <strong>{section.title}</strong>
                                <span className="mr-2 text-[#777b8d]">{section.question_count||0} سؤال · {section.marks} درجة · {section.time_limit_minutes} دقيقة</span>
                              </div>
                            ))}
                          </div>
                          <a
                            href={"/admin/exams/" + exam.id}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[#dcd7e5] bg-white px-4 py-3 text-sm font-black transition hover:border-[#6366F1]/50 hover:bg-[#f8f7ff]"
                          >
                            إدارة الاختبار والأسئلة
                          </a>
                        </article>
                      );
                    })}
                    {data.exams.length===0?<div className="rounded-xl bg-[#f7f7fa] p-5 text-[#777b8d]">لا توجد اختبارات حتى الآن.</div>:null}
                  </div>
                </Panel>
              </div>
            ) : null}

            {tab === "questions" ? (
              <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
                <Panel title="إضافة سؤال" subtitle="أضف أسئلة اختيار من متعدد أو صح وخطأ أو أسئلة كتابية مع نصوص اختيارية.">
                  <form onSubmit={addQuestion} className="space-y-4">
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">الاختبار</span>
                      <select className="field" required value={questionForm.examId} onChange={(e)=>setQuestionForm({...questionForm,examId:e.target.value,sectionId:""})}>
                        <option value="">اختر الاختبار</option>
                        {data.exams.map((exam)=><option key={exam.id} value={exam.id}>{courseMap.get(exam.course_id)?.code} — {exam.title}</option>)}
                      </select>
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">القسم / المهارة</span>
                      <select className="field" required value={questionForm.sectionId} onChange={(e)=>setQuestionForm({...questionForm,sectionId:e.target.value})}>
                        <option value="">اختر القسم</option>
                        {sectionsForQuestion.map((section)=><option key={section.id} value={section.id}>{section.position}. {section.title}</option>)}
                      </select>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">نوع السؤال</span><select className="field" value={questionForm.type} onChange={(e)=>setQuestionForm({...questionForm,type:e.target.value})}><option value="MULTIPLE_CHOICE">اختيار من متعدد</option><option value="TRUE_FALSE">صح / خطأ</option><option value="SHORT_ANSWER">إجابة كتابية</option></select></label>
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">الدرجة</span><input className="field" type="number" min={0.25} step={0.25} value={questionForm.marks} onChange={(e)=>setQuestionForm({...questionForm,marks:Number(e.target.value)})}/></label>
                      <label className="block min-w-0"><span className="mb-2 block text-sm font-black">الصعوبة</span><select className="field" value={questionForm.difficulty} onChange={(e)=>setQuestionForm({...questionForm,difficulty:e.target.value})}><option value="EASY">سهل</option><option value="MEDIUM">متوسط</option><option value="HARD">صعب</option></select></label>
                    </div>

                    <div className="rounded-2xl border border-[#e6e1e9] bg-[#faf9fb] p-4">
                      <div className="mb-3 text-sm font-black">قطعة قراءة اختيارية</div>
                      <input className="field mb-3" placeholder="عنوان القطعة" value={questionForm.passageTitle} onChange={(e)=>setQuestionForm({...questionForm,passageTitle:e.target.value})}/>
                      <textarea className="field min-h-32" placeholder="نص القطعة..." value={questionForm.passageBody} onChange={(e)=>setQuestionForm({...questionForm,passageBody:e.target.value})}/>
                    </div>

                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-black">نص السؤال</span>
                      <textarea className="field min-h-28" required value={questionForm.prompt} onChange={(e)=>setQuestionForm({...questionForm,prompt:e.target.value})}/>
                    </label>

                    {questionForm.type==="MULTIPLE_CHOICE"?(
                      <div>
                        <div className="mb-2 text-sm font-black">الخيارات — حدد إجابة صحيحة واحدة</div>
                        <div className="space-y-2">
                          {questionForm.options.map((option,index)=>(
                            <div key={index} className="flex items-center gap-3">
                              <input type="radio" name="correct-option" checked={option.isCorrect} onChange={()=>setQuestionForm({...questionForm,options:questionForm.options.map((item,i)=>({...item,isCorrect:i===index}))})}/>
                              <input className="field" placeholder={"الخيار "+(index+1)} required={index<2} value={option.label} onChange={(e)=>setQuestionForm({...questionForm,options:questionForm.options.map((item,i)=>i===index?{...item,label:e.target.value}:item)})}/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ):null}

                    {questionForm.type==="TRUE_FALSE"?(
                      <div className="rounded-2xl border border-[#e6e1e9] p-4">
                        <div className="mb-3 text-sm font-black">الإجابة الصحيحة</div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2"><input type="radio" checked={questionForm.correctBoolean===true} onChange={()=>setQuestionForm({...questionForm,correctBoolean:true})}/> صح</label>
                          <label className="flex items-center gap-2"><input type="radio" checked={questionForm.correctBoolean===false} onChange={()=>setQuestionForm({...questionForm,correctBoolean:false})}/> خطأ</label>
                        </div>
                      </div>
                    ):null}

                    {questionForm.type==="SHORT_ANSWER"?(
                      <div className="rounded-2xl border border-[#e6e1e9] p-4">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-black">طريقة التصحيح</span>
                          <select className="field" value={questionForm.gradingMode} onChange={(e)=>setQuestionForm({...questionForm,gradingMode:e.target.value})}>
                            <option value="AUTO">تلقائي</option>
                            <option value="MANUAL">يدوي</option>
                          </select>
                        </label>
                        {questionForm.gradingMode==="AUTO"?(
                          <label className="mt-3 block">
                            <span className="mb-2 block text-sm font-black">الإجابات المقبولة — إجابة واحدة في كل سطر</span>
                            <textarea className="field min-h-28" value={questionForm.acceptableAnswers} onChange={(e)=>setQuestionForm({...questionForm,acceptableAnswers:e.target.value})}/>
                          </label>
                        ):null}
                      </div>
                    ):null}

                    <button className="btn w-full" disabled={submitting}><Plus size={18}/> {submitting?"جاري الحفظ...":"إضافة السؤال"}</button>
                  </form>
                </Panel>

                <Panel title="هيكل الاختبار" subtitle="راجع الأسئلة والدرجات في كل قسم.">
                  <div className="space-y-4">
                    {data.exams.map((exam)=>(
                      <article key={exam.id} className="rounded-2xl border border-[#e9e5ee] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-black text-[#B1785C]">{courseMap.get(exam.course_id)?.code} · {exam.category}</div>
                            <h3 dir="ltr" className="mt-1 font-black">{exam.title}</h3>
                          </div>
                          <div className="rounded-xl bg-[#f4f2f7] px-3 py-2 text-sm font-black">{exam.total_marks} درجة</div>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {data.sections.filter((section)=>section.exam_id===exam.id).map((section)=>(
                            <button
                              key={section.id}
                              type="button"
                              onClick={()=>{
                                setQuestionForm((current)=>({...current,examId:exam.id,sectionId:section.id}));
                                window.scrollTo({top:0,behavior:"smooth"});
                              }}
                              className="rounded-xl border border-[#ebe7ef] bg-[#faf9fb] p-3 text-right transition hover:border-[#B1785C]/50 hover:bg-[#fbf6f3]"
                            >
                              <strong className="block">{section.title}</strong>
                              <span className="mt-1 block text-xs text-[#777b8d]">{section.question_count||0} سؤال · {section.marks} درجة · {section.time_limit_minutes} دقيقة</span>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>
              </div>
            ) : null}
          </div>
        </main>
      </div>

    </div>
  );
}
