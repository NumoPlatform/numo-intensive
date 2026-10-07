"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { intensiveFetch } from "@/lib/intensive/client";

type SectionScore = {
  sectionId: string;
  title: string;
  score: number;
  totalMarks: number;
  percentage: number;
};

type AttemptHistory = {
  id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  result: {
    attempt_id: string;
    final_score: number | null;
    total_marks: number;
    percentage: number | null;
    status: string | null;
    grading_status: string;
    published_at: string | null;
  } | null;
  sectionBreakdown: SectionScore[];
};

type Payload = {
  ok: boolean;
  course: { id: string; code: string; title: string } | null;
  exam: {
    id: string;
    title: string;
    category: string;
    starts_at: string;
    ends_at: string;
    attempts_allowed: number;
    total_marks: number;
    status: string;
  };
  attemptsUsed: number;
  attemptsRemaining: number;
  bestResult: {
    final_score: number | null;
    total_marks: number;
    percentage: number | null;
  } | null;
  history: AttemptHistory[];
  now: string;
};

function fmt(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export default function ResultHistoryPortal() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await intensiveFetch("/api/results?examId=" + encodeURIComponent(examId), {
          cache: "no-store",
        });
        const payload = await response.json();
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/");
          return;
        }
        if (!response.ok) throw new Error(payload.message || "تعذر تحميل سجل النتائج.");
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذر تحميل سجل النتائج.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [examId]);

  const bestAttempt = useMemo(() => {
    if (!data) return null;
    return [...data.history]
      .filter((attempt) => attempt.result?.percentage !== null && attempt.result?.percentage !== undefined)
      .sort((a, b) => Number(b.result?.percentage ?? 0) - Number(a.result?.percentage ?? 0))[0] ?? null;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7fb] text-[#1F2B5E]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 animate-spin" size={28} />
          <div className="font-black">Loading result history...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7fb] px-4">
        <div className="w-full max-w-lg rounded-[1.6rem] border border-rose-100 bg-white p-6 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-3 text-rose-600" />
          <h1 className="text-xl font-black text-[#1F2B5E]">Result history unavailable</h1>
          <p className="mt-2 text-sm leading-7 text-[#73788d]">{error || "Try again in a moment."}</p>
          <a href="/" className="btn mt-5">Return to portal</a>
        </div>
      </div>
    );
  }

  const now = new Date(data.now).getTime();
  const isOpen = now >= new Date(data.exam.starts_at).getTime() && now <= new Date(data.exam.ends_at).getTime();
  const canRetry = isOpen && data.attemptsRemaining > 0 && !data.history.some((attempt) => attempt.status === "IN_PROGRESS");

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#f6f7fb] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="numo-hero-radiance relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#17204B,#1F2B5E_58%,#303B78)] p-6 text-white shadow-[0_26px_70px_rgba(31,43,94,.22)] sm:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#B1785C]/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <a href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-black text-white/70 hover:text-white">
                <ArrowLeft size={15} /> العودة إلى {BRAND.nameAr}
              </a>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[.13em] text-white/55" dir="ltr">
                {BRAND.nameEn}
              </div>
              <div className="text-xs font-black tracking-[.14em] text-[#e9bda6]">
                {data.course?.code ?? "NUMO"} · {data.exam.category}
              </div>
              <h1 className="mt-2 text-2xl font-black sm:text-4xl">{data.exam.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                راجع محاولاتك المنشورة، أداءك في الأقسام، وأفضل نتيجة حققتها.
              </p>
            </div>

            {canRetry ? (
              <a href={"/exam/" + data.exam.id} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#1F2B5E]">
                <RotateCcw size={17} /> ابدأ محاولة جديدة
              </a>
            ) : null}
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="numo-card-lift numo-stat-glow rounded-[1.45rem] border border-[#e4e0e9] bg-white p-5 shadow-[0_14px_38px_rgba(31,43,94,.07)]">
            <Trophy className="mb-3 text-[#B1785C]" />
            <div className="text-3xl font-black">{data.bestResult?.percentage ?? "—"}{data.bestResult ? "%" : ""}</div>
            <div className="mt-1 text-sm font-bold text-[#74798d]">أفضل نتيجة</div>
          </div>
          <div className="numo-card-lift numo-stat-glow rounded-[1.45rem] border border-[#e4e0e9] bg-white p-5 shadow-[0_14px_38px_rgba(31,43,94,.07)]">
            <BarChart3 className="mb-3 text-[#6366F1]" />
            <div className="text-3xl font-black">{data.attemptsUsed}</div>
            <div className="mt-1 text-sm text-[#74798d]">المحاولات المستخدمة</div>
          </div>
          <div className="numo-card-lift numo-stat-glow rounded-[1.45rem] border border-[#e4e0e9] bg-white p-5 shadow-[0_14px_38px_rgba(31,43,94,.07)]">
            <Clock3 className="mb-3 text-[#6366F1]" />
            <div className="text-3xl font-black">{data.attemptsRemaining}</div>
            <div className="mt-1 text-sm text-[#74798d]">المحاولات المتبقية</div>
          </div>
          <div className="numo-card-lift numo-stat-glow rounded-[1.45rem] border border-[#e4e0e9] bg-white p-5 shadow-[0_14px_38px_rgba(31,43,94,.07)]">
            <Award className="mb-3 text-emerald-600" />
            <div className="text-3xl font-black">{data.exam.total_marks}</div>
            <div className="mt-1 text-sm font-bold text-[#74798d]">الدرجة الكلية</div>
          </div>
        </section>

        {bestAttempt ? (
          <section className="mt-5 rounded-[1.6rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black tracking-[.12em] text-emerald-700">أفضل محاولة</div>
                <h2 className="mt-1 text-xl font-black">المحاولة {bestAttempt.attempt_number}</h2>
              </div>
              <div className="rounded-xl bg-white px-4 py-2 text-2xl font-black text-emerald-700 shadow-sm">
                {bestAttempt.result?.percentage ?? 0}%
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 space-y-4">
          {data.history.length ? (
            data.history.map((attempt) => (
              <article key={attempt.id} className="numo-card-lift numo-metal-border overflow-hidden rounded-[1.6rem] border border-[#e4e0e9] bg-white shadow-[0_14px_40px_rgba(31,43,94,.07)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf2] p-5">
                  <div>
                    <div className="text-xs font-black text-[#B1785C]">المحاولة {attempt.attempt_number}</div>
                    <div className="mt-1 text-sm font-bold text-[#73788d]">
                      بدأت {fmt(attempt.started_at)} · سُلّمت {fmt(attempt.submitted_at)}
                    </div>
                  </div>

                  {attempt.result ? (
                    <div className="text-right">
                      <div className="text-2xl font-black">{attempt.result.percentage ?? 0}%</div>
                      <div className="text-xs font-bold text-[#73788d]">
                        {attempt.result.final_score ?? 0} / {attempt.result.total_marks}
                      </div>
                    </div>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                      {attempt.status === "IN_PROGRESS" ? "قيد التنفيذ" : attempt.status}
                    </span>
                  )}
                </div>

                {attempt.result ? (
                  <div className="p-5">
                    {attempt.sectionBreakdown.length ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {attempt.sectionBreakdown.map((section) => (
                          <div key={section.sectionId} className="rounded-2xl bg-[#f8f7fa] p-4">
                            <div className="text-xs font-black text-[#B1785C]">{section.title}</div>
                            <div className="mt-2 text-2xl font-black">{section.percentage}%</div>
                            <div className="mt-1 text-xs font-bold text-[#787d91]">{section.score} / {section.totalMarks}</div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9e5ee]">
                              <div
                                className="h-full rounded-full bg-[#6366F1]"
                                style={{ width: Math.max(0, Math.min(100, Number(section.percentage))) + "%" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#f8f7fa] p-4 text-sm text-[#74798d]">
                        تفصيل النتائج حسب الأقسام غير متاح لهذه المحاولة.
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 text-xs font-black text-emerald-700">
                      <CheckCircle2 size={15} /> تم نشر النتيجة مباشرة
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-[#d5cfdd] bg-white p-8 text-center">
              <BarChart3 className="mx-auto mb-3 text-[#B1785C]" />
              <h2 className="text-lg font-black">لا توجد محاولات حتى الآن</h2>
              <p className="mt-1 text-sm text-[#74798d]">ابدأ الاختبار لإنشاء أول نتيجة لك.</p>
              {isOpen ? <a href={"/exam/" + data.exam.id} className="btn mt-5">ابدأ الاختبار</a> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
