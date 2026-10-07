"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { intensiveFetch } from "@/lib/intensive/client";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Download,
  Gauge,
  GraduationCap,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

type AnalyticsPayload = {
  generatedAt: string;
  summary: {
    students: number;
    exams: number;
    attempts: number;
    inProgressAttempts: number;
    completedResults: number;
    publishedResults: number;
    bestResultRecords: number;
    averagePercentage: number | null;
    passRate: number | null;
  };
  courseAnalytics: Array<{
    id: string;
    code: string;
    title: string;
    results: number;
    averagePercentage: number | null;
    passRate: number | null;
  }>;
  examAnalytics: Array<{
    id: string;
    courseCode: string;
    title: string;
    category: string;
    status: string;
    attempts: number;
    submitted: number;
    gradedResults: number;
    averagePercentage: number | null;
    passRate: number | null;
  }>;
};

function pct(value: number | null) {
  return value === null ? "—" : value.toFixed(1) + "%";
}

function meter(value: number | null) {
  const safe = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#eceaf2]">
      <div className="h-full rounded-full bg-gradient-to-r from-[#B1785C] to-[#6366F1]" style={{ width: safe + "%" }} />
    </div>
  );
}

export default function AnalyticsPortal() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/analytics", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.replace("/");
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر تحميل التحليلات.");
      setData(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر تحميل التحليلات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCourses = useMemo(
    () => (data?.courseAnalytics ?? []).filter((course) => course.results > 0),
    [data],
  );

  return (
    <div className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
            <ArrowLeft size={17} /> Back to admin dashboard
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/admin/results-export"
              className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-2 text-sm font-black shadow-sm"
            >
              <Download size={16} /> Export all results
            </a>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-2 text-sm font-black shadow-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh analytics
            </button>
          </div>
        </div>

        <header className="mb-7 overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-[#1F2B5E] via-[#2b3c7c] to-[#6366F1] p-5 text-white sm:p-7 shadow-[0_24px_70px_rgba(31,43,94,.22)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]">
                <Sparkles size={16} /> {BRAND.adminTitleEn}
              </div>
              <h1 className="text-2xl font-black sm:text-3xl sm:text-4xl">النتائج والتحليلات</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Academic performance, exam participation, and publication status in one control center.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm">
              <div className="text-xs font-bold text-white/60">Last generated</div>
              <div className="mt-1 font-black">
                {data?.generatedAt
                  ? new Intl.DateTimeFormat("ar-SA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Riyadh",
                    }).format(new Date(data.generatedAt))
                  : "—"}
              </div>
            </div>
          </div>
        </header>

        {notice ? (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {notice}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="grid min-h-80 place-items-center rounded-[1.75rem] border border-[#e2dfe8] bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 animate-spin" />
              <div className="font-black">Loading performance analytics...</div>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-7">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Students", value: String(data.summary.students), icon: UsersRound, note: "حسابات الطلاب المسجلة" },
                { label: "Exam attempts", value: String(data.summary.attempts), icon: GraduationCap, note: data.summary.inProgressAttempts + " قيد التنفيذ حاليا" },
                { label: "Best-attempt average", value: pct(data.summary.averagePercentage), icon: Gauge, note: data.summary.bestResultRecords + " أفضل نتائج الطلاب حسب النموذج" },
                { label: "Best-attempt pass rate", value: pct(data.summary.passRate), icon: Target, note: data.summary.publishedResults + " نتائج منشورة" },
              ].map(({ label, value, icon: Icon, note }) => (
                <article key={label} className="rounded-[1.55rem] border border-[#e3dfe9] bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2f1ff] text-[#6366F1]">
                      <Icon size={21} />
                    </div>
                    <span className="rounded-full bg-[#fbf4f0] px-3 py-1 text-[11px] font-black text-[#9a6249]">LIVE DATA</span>
                  </div>
                  <div className="text-sm font-black text-[#73788d]">{label}</div>
                  <div className="mt-1 text-2xl font-black sm:text-4xl tracking-tight">{value}</div>
                  <div className="mt-2 text-xs leading-5 text-[#8a8fa0]">{note}</div>
                </article>
              ))}
            </section>

            <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpenCheck size={20} className="text-[#B1785C]" />
                    <h2 className="text-xl font-black">أداء المواد</h2>
                  </div>
                  <p className="mt-1 text-sm text-[#777b8d]">Performance uses each student's best completed attempt per model, so four-attempt practice does not distort the averages.</p>
                </div>
                <span className="rounded-full bg-[#f5f4f8] px-3 py-1.5 text-xs font-black text-[#74798d]">
                  {activeCourses.length} courses with results
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {data.courseAnalytics.map((course) => (
                  <article key={course.id} className="rounded-2xl border border-[#ebe7ef] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black tracking-wide text-[#B1785C]">{course.code}</div>
                        <h3 className="mt-1 font-black">{course.title}</h3>
                      </div>
                      <div className="rounded-xl bg-[#f4f2f7] px-3 py-2 text-xs font-black">
                        {course.results} result{course.results === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-[#777b8d]">
                          <span>Best avg</span><span>{pct(course.averagePercentage)}</span>
                        </div>
                        {meter(course.averagePercentage)}
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-[#777b8d]">
                          <span>Best pass rate</span><span>{pct(course.passRate)}</span>
                        </div>
                        {meter(course.passRate)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2f1ff] text-[#6366F1]">
                  <BarChart3 size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Exam analytics</h2>
                  <p className="text-sm text-[#777b8d]">Participation counts every attempt; score performance uses each student's best completed attempt.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-[#e9e5ed] text-[#777b8d]">
                      <th className="px-3 py-3 font-black">Exam</th>
                      <th className="px-3 py-3 font-black">Course</th>
                      <th className="px-3 py-3 font-black">Status</th>
                      <th className="px-3 py-3 font-black">المحاولات</th>
                      <th className="px-3 py-3 font-black">Submitted</th>
                      <th className="px-3 py-3 font-black">Graded</th>
                      <th className="px-3 py-3 font-black">المتوسط</th>
                      <th className="px-3 py-3 font-black">نسبة النجاح</th>
                      <th className="px-3 py-3 font-black">تصدير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.examAnalytics.map((exam) => (
                      <tr key={exam.id} className="border-b border-[#f0edf2]">
                        <td className="px-3 py-4">
                          <div className="text-xs font-black text-[#B1785C]">{exam.category}</div>
                          <div className="mt-1 font-black">{exam.title}</div>
                        </td>
                        <td className="px-3 py-4 font-black">{exam.courseCode}</td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-[#f3f1f7] px-2.5 py-1 text-xs font-black">{exam.status}</span>
                        </td>
                        <td className="px-3 py-4">{exam.attempts}</td>
                        <td className="px-3 py-4">{exam.submitted}</td>
                        <td className="px-3 py-4">{exam.gradedResults}</td>
                        <td className="px-3 py-4 font-black">{pct(exam.averagePercentage)}</td>
                        <td className="px-3 py-4 font-black">{pct(exam.passRate)}</td>
                        <td className="px-3 py-4">
                          <a
                            href={"/api/admin/results-export?examId=" + encodeURIComponent(exam.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd8e5] bg-white px-2.5 py-2 text-xs font-black hover:bg-[#f8f7fa]"
                          >
                            <Download size={14} /> CSV
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.examAnalytics.length === 0 ? (
                  <div className="py-12 text-center text-[#777b8d]">
                    <CheckCircle2 className="mx-auto mb-3" />
                    No exams have been created yet.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
