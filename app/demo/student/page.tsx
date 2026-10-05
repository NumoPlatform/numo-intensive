"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  History,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { demoSections, type DemoSectionName } from "../demo-data";

type TrialState = { attempts: number; bestPercentage: number | null; lastPercentage: number | null };
const empty: TrialState = { attempts: 0, bestPercentage: null, lastPercentage: null };
const key = (section: DemoSectionName) => "numo_intensive_demo_" + section.toLowerCase();

const demoCourses = [
  { code: "EL097_EL099E", title: "English Foundation", status: "متاح", students: 124 },
  { code: "EL098", title: "English Intensive", status: "متاح", students: 91 },
  { code: "EL099", title: "English Intensive", status: "متاح", students: 78 },
  { code: "EL111", title: "English Communication Skills", status: "مفتوح الآن", students: 143 },
  { code: "EL112", title: "English Communication Skills", status: "قريبا", students: 106 },
];

export default function DemoStudentPage() {
  const [trials, setTrials] = useState<Record<DemoSectionName, TrialState>>({
    Grammar: empty,
    Vocabulary: empty,
    Reading: empty,
  });

  useEffect(() => {
    const next = { ...trials };
    for (const section of demoSections) {
      try {
        const raw = localStorage.getItem(key(section.title));
        if (raw) next[section.title] = JSON.parse(raw) as TrialState;
      } catch {}
    }
    setTrials(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const best = useMemo(() => {
    const scores = Object.values(trials)
      .map((item) => item.bestPercentage)
      .filter((item): item is number => item !== null);
    return scores.length ? Math.max(...scores) : null;
  }, [trials]);

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/demo" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
            <ArrowRight size={17} /> العودة للتجربة
          </Link>
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="شعار نمو" className="h-11 w-11 rounded-xl bg-[#1F2B5E] p-1.5" />
            <div>
              <div className="font-black">منصة نمو</div>
              <div className="text-[10px] font-bold tracking-[.12em] text-[#B1785C]" dir="ltr">NUMO INTENSIVE</div>
            </div>
          </div>
        </div>

        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#2b3c7c] to-[#6366F1] p-8 text-white shadow-[0_25px_70px_rgba(31,43,94,.22)]">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#B1785C]/25 blur-3xl" />
          <div className="absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]">
                <Sparkles size={16} /> واجهة الطالب التجريبية
              </div>
              <h1 className="mt-2 text-4xl font-black">مرحبا بك في منصة نمو</h1>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-white/75">
                مقرراتك واختباراتك ونتائجك في واجهة واحدة فخمة. تجربة EL111 الحالية مقسمة إلى Grammar وVocabulary وReading.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-white/10 px-3 py-2">30 دقيقة لكل قسم</span>
                <span className="rounded-full bg-white/10 px-3 py-2">4 محاولات</span>
                <span className="rounded-full bg-white/10 px-3 py-2">نتيجة مباشرة</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
              <ShieldCheck className="mx-auto text-[#e7b399]" />
              <div className="mt-2 font-black">الجهاز الحالي موثوق</div>
              <div className="mt-1 text-xs text-white/55">جهاز واحد لكل طالب</div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e3dfe9] bg-white p-5 shadow-sm">
            <BookOpen className="text-[#B1785C]" />
            <div className="mt-3 text-3xl font-black">5</div>
            <div className="text-sm text-[#73788d]">مقررات مكثفة</div>
          </div>
          <div className="rounded-2xl border border-[#e3dfe9] bg-white p-5 shadow-sm">
            <History className="text-[#6366F1]" />
            <div className="mt-3 text-3xl font-black">4</div>
            <div className="text-sm text-[#73788d]">محاولات لكل قسم</div>
          </div>
          <div className="rounded-2xl border border-[#e3dfe9] bg-white p-5 shadow-sm">
            <Award className="text-emerald-600" />
            <div className="mt-3 text-3xl font-black">{best === null ? "—" : best + "%"}</div>
            <div className="text-sm text-[#73788d]">أفضل نتيجة تجريبية</div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[.14em] text-[#B1785C]">مقرراتي</div>
              <h2 className="mt-1 text-2xl font-black">الدورات المكثفة</h2>
            </div>
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#73788d] shadow-sm">5 مقررات</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {demoCourses.map((course) => {
              const visual = courseVisual(course.code);
              const isCurrent = course.code === "EL111";
              return (
                <article
                  key={course.code}
                  className={"group overflow-hidden rounded-[1.55rem] border bg-white shadow-[0_14px_38px_rgba(31,43,94,.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(31,43,94,.12)] " + (isCurrent ? "border-[#B1785C]/50 ring-4 ring-[#B1785C]/10" : "border-[#e3dfe9]")}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={courseCover(course.code)}
                      alt={"غلاف " + course.code}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E]/70 via-transparent to-transparent" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black">{visual.level}</span>
                    {isCurrent ? (
                      <span className="absolute left-3 top-3 rounded-full bg-[#B1785C] px-3 py-1 text-[10px] font-black text-white">المقرر الحالي</span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div dir="ltr" className="text-xl font-black">{course.code}</div>
                    <div className="mt-1 min-h-10 text-xs font-bold leading-5 text-[#73788d]">{course.title}</div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="font-black" style={{ color: visual.accent }}>{course.status}</span>
                      <span className="text-[#969aab]">{visual.label}</span>
                    </div>
                    {isCurrent ? (
                      <a href="#el111-sections" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2B5E] px-3 py-2.5 text-xs font-black text-white">
                        <Play size={14} /> فتح الاختبارات
                      </a>
                    ) : (
                      <div className="mt-4 rounded-xl bg-[#f7f6f9] px-3 py-2.5 text-center text-xs font-black text-[#85899a]">عرض المقرر</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="el111-sections" className="mt-8 rounded-[2rem] border border-[#e2dfe8] bg-white p-5 shadow-[0_18px_45px_rgba(31,43,94,.06)] sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black text-[#B1785C]" dir="ltr">EL111 · MIDTERM</div>
              <h2 className="mt-1 text-2xl font-black">اختر القسم وابدأ المحاولة</h2>
              <p className="mt-2 text-sm text-[#777b8d]">كل قسم مستقل بوقته ومحاولاته ونتيجته.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">متاح الآن</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {demoSections.map((section, index) => {
              const trial = trials[section.title];
              const left = Math.max(0, section.attemptsAllowed - trial.attempts);
              const accent = ["#1F2B5E", "#B1785C", "#6366F1"][index] ?? "#6366F1";
              return (
                <article key={section.id} className="overflow-hidden rounded-[1.7rem] border border-[#e2dfe8] bg-white shadow-[0_14px_36px_rgba(31,43,94,.07)]">
                  <div className="h-2" style={{ background: accent }} />
                  <div className="p-5">
                    <div className="text-xs font-black text-[#B1785C]">MIDTERM</div>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <h3 className="text-2xl font-black">{section.title}</h3>
                      <span className="rounded-full bg-[#f3f2f8] px-2.5 py-1 text-[11px] font-black">القسم {index + 1}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <strong className="block text-lg">{section.questionCount}</strong>سؤال
                      </div>
                      <div className="rounded-xl bg-[#f8f7fa] p-3">
                        <strong className="flex items-center gap-1 text-lg"><Clock3 size={14} />{section.minutes}</strong>دقيقة
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-black">
                      <span className="text-[#73788d]">{left} من {section.attemptsAllowed} متبقية</span>
                      {trial.bestPercentage !== null ? <span className="text-emerald-700">أفضل درجة {trial.bestPercentage}%</span> : null}
                    </div>
                    <Link
                      href={left > 0 ? "/demo/student/exam?section=" + encodeURIComponent(section.title) : "#"}
                      aria-disabled={left <= 0}
                      className={"mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black " + (left > 0 ? "bg-[#1F2B5E] text-white" : "pointer-events-none bg-[#ecebf0] text-[#999dad]")}
                    >
                      <Play size={16} />{trial.attempts ? "محاولة جديدة" : "بدء القسم"}
                    </Link>
                    {trial.attempts > 0 ? (
                      <div className="mt-3 rounded-xl bg-[#f8f7fa] p-3 text-xs text-[#73788d]">
                        {trial.attempts} مستخدمة · آخر نتيجة {trial.lastPercentage}%
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">
          <CheckCircle2 className="mt-1 shrink-0" size={18} />
          هذه النسخة التجريبية تعرض هيكل EL111 الحقيقي: 27 سؤال Grammar و19 Vocabulary و86 Reading.
        </div>
      </div>
    </main>
  );
}
