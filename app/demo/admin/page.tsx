"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GraduationCap,
  KeyRound,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { courseCover, courseVisual } from "@/lib/intensive/ui";
import { demoSections } from "../demo-data";

const demoCourses = [
  { code: "EL097_EL099E", students: 124, exams: 3 },
  { code: "EL098", students: 91, exams: 4 },
  { code: "EL099", students: 78, exams: 3 },
  { code: "EL111", students: 143, exams: 3 },
  { code: "EL112", students: 106, exams: 2 },
];

export default function DemoAdminPage() {
  const [selected, setSelected] = useState("grammar");
  const [activeCourses, setActiveCourses] = useState<Record<string, boolean>>(
    Object.fromEntries(demoCourses.map((course) => [course.code, true])),
  );
  const section = useMemo(
    () => demoSections.find((item) => item.id === selected) ?? demoSections[0],
    [selected],
  );

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

        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7c] to-[#6366F1] p-8 text-white shadow-[0_25px_70px_rgba(31,43,94,.22)]">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#B1785C]/25 blur-3xl" />
          <div className="absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]">
                <Sparkles size={16} /> لوحة المدير التجريبية
              </div>
              <h1 className="mt-2 text-4xl font-black">مركز تحكم NUMO INTENSIVE</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                إدارة الطلاب والمقررات والاختبارات والمحاولات والنتائج وإعدادات الوصول من مكان واحد.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="text-xs text-white/55">هيكل الاختبار المعتمد</div>
              <div className="mt-1 font-black">Grammar · Vocabulary · Reading</div>
              <div className="mt-2 text-xs text-[#efc8b4]">30 دقيقة · 4 محاولات · نتيجة مباشرة</div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["الطلاب المسجلون", "542", UsersRound],
            ["المقررات الفعالة", "5", BookOpenCheck],
            ["بنك الأسئلة", "132", CheckCircle2],
            ["سياسة الأجهزة", "جهاز واحد", ShieldCheck],
          ].map(([label, value, Icon]) => {
            const I = Icon as typeof UsersRound;
            return (
              <article key={String(label)} className="rounded-2xl border border-[#e3dfe9] bg-white p-5 shadow-sm">
                <I size={21} className="text-[#6366F1]" />
                <div className="mt-4 text-sm font-black text-[#777b8d]">{String(label)}</div>
                <div className="mt-1 text-3xl font-black">{String(value)}</div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[1.8rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[.14em] text-[#B1785C]">إدارة المقررات</div>
              <h2 className="mt-1 text-2xl font-black">كل مقررات NUMO INTENSIVE</h2>
              <p className="mt-2 text-sm text-[#777b8d]">الغلاف والحالة وعدد الطلاب والاختبارات ظاهرة للمدير مباشرة.</p>
            </div>
            <button className="rounded-xl bg-[#1F2B5E] px-4 py-2.5 text-sm font-black text-white">+ إضافة مقرر</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {demoCourses.map((course) => {
              const visual = courseVisual(course.code);
              const active = activeCourses[course.code];
              return (
                <article key={course.code} className="overflow-hidden rounded-[1.45rem] border border-[#e5e1e9] bg-white shadow-[0_12px_32px_rgba(31,43,94,.06)]">
                  <div className="relative h-32 overflow-hidden">
                    <img src={courseCover(course.code)} alt={"غلاف " + course.code} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E]/70 via-transparent to-transparent" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black">{visual.level}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div dir="ltr" className="text-lg font-black">{course.code}</div>
                      <button
                        onClick={() => setActiveCourses((prev) => ({ ...prev, [course.code]: !prev[course.code] }))}
                        className={"rounded-full px-2.5 py-1 text-[10px] font-black transition " + (active ? "bg-emerald-50 text-emerald-700" : "bg-[#f0eef3] text-[#85899a]")}
                      >
                        {active ? "فعال" : "متوقف"}
                      </button>
                    </div>
                    <div className="mt-1 text-xs font-bold text-[#848899]">{visual.label}</div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#f8f7fa] p-2.5"><strong className="block text-base">{course.students}</strong>طالب</div>
                      <div className="rounded-xl bg-[#f8f7fa] p-2.5"><strong className="block text-base">{course.exams}</strong>اختبار</div>
                    </div>
                    <button className="mt-3 w-full rounded-xl border border-[#ded9e5] px-3 py-2 text-xs font-black">إدارة التفاصيل</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-[#B1785C]" />
              <h2 className="text-xl font-black">أقسام اختبار EL111</h2>
            </div>
            <p className="mt-1 text-sm text-[#777b8d]">كل قسم مستقل بوقت ومحاولات ونتيجة خاصة به.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {demoSections.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={"rounded-2xl border p-4 text-right transition " + (selected === item.id ? "border-[#6366F1] bg-[#f3f3ff] ring-4 ring-[#6366F1]/10" : "border-[#e8e4ed] hover:bg-[#faf9fb]")}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1F2B5E] text-xs font-black text-white">{index + 1}</div>
                  <div className="mt-3 text-lg font-black">{item.title}</div>
                  <div className="mt-3 text-xs leading-6 text-[#73788d]">
                    {item.questionCount} سؤال<br />{item.minutes} دقيقة<br />{item.attemptsAllowed} محاولات
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black text-[#B1785C]">
              <Settings2 size={16} /> إعدادات القسم المحدد
            </div>
            <h2 className="mt-2 text-2xl font-black">{section.title}</h2>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["الأسئلة", String(section.questionCount)],
                ["الوقت", section.minutes + " دقيقة"],
                ["المحاولات", section.attemptsAllowed + " لكل طالب"],
                ["النتيجة", "مباشرة"],
                ["المراجعة", "الأخطاء + الإجابات الصحيحة"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-[#f0edf3] pb-3">
                  <span className="text-[#7b8092]">{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
            <button className="mt-5 w-full rounded-xl bg-[#1F2B5E] px-4 py-3 text-sm font-black text-white">حفظ إعدادات القسم</button>
          </aside>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <article className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm">
            <UsersRound size={21} className="text-[#B1785C]" />
            <h3 className="mt-3 text-lg font-black">إدارة الطلاب</h3>
            <p className="mt-2 text-sm leading-7 text-[#777b8d]">إنشاء الطالب، ربط المقرر، إيقاف الحساب، ومراجعة المحاولات.</p>
            <button className="mt-4 w-full rounded-xl bg-[#f7f6f9] px-4 py-3 text-sm font-black">فتح الطلاب</button>
          </article>
          <article className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm">
            <KeyRound size={21} className="text-[#6366F1]" />
            <h3 className="mt-3 text-lg font-black">الوصول والجهاز</h3>
            <p className="mt-2 text-sm leading-7 text-[#777b8d]">جهاز موثوق واحد لكل طالب مع إعادة ضبط فورية من المدير.</p>
            <button className="mt-4 w-full rounded-xl bg-[#f7f6f9] px-4 py-3 text-sm font-black">إدارة الأجهزة</button>
          </article>
          <article className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm">
            <Clock3 size={21} className="text-emerald-600" />
            <h3 className="mt-3 text-lg font-black">الجدولة والنتائج</h3>
            <p className="mt-2 text-sm leading-7 text-[#777b8d]">حدد وقت الفتح والإغلاق وراقب النتائج فوريا مع التصدير.</p>
            <button className="mt-4 w-full rounded-xl bg-[#f7f6f9] px-4 py-3 text-sm font-black">فتح الجدولة</button>
          </article>
        </section>

        <section className="mt-6 rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#B1785C]" />
            <h2 className="text-xl font-black">التحكم في دخول الطالب</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "المدير ينشئ اسم المستخدم وكلمة المرور",
              "جهاز موثوق واحد لكل طالب",
              "المدير يستطيع إعادة ضبط الجهاز فوريا",
            ].map((item) => <div key={item} className="rounded-xl bg-[#f8f7fa] p-4 text-sm font-black">{item}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
