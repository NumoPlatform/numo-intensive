"use client";

import NumoBrand from "@/app/components/NumoBrand";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";

type Course = {
  id: string;
  code: string;
  title: string;
  default_cover_url: string | null;
  is_active: boolean;
};
type Overview = { courses: Course[] };
type ExamDefaults = {
  default_section_minutes?: number;
  default_attempts?: number;
  default_result_release?: "IMMEDIATE" | "AFTER_END" | "MANUAL";
};

const initial = {
  courseId: "",
  title: "",
  category: "MIDTERM",
  description: "",
  startsAt: "",
  endsAt: "",
  sectionDurations: {
    Grammar: 30,
    Vocabulary: 30,
    Reading: 30,
  },
  attemptsAllowed: 4,
  resultRelease: "IMMEDIATE",
};

function riyadhLocalToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? trimmed + ":00" : trimmed;
  return new Date(withSeconds + "+03:00").toISOString();
}

export default function ExamWizard() {
  const [data, setData] = useState<Overview | null>(null);
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      intensiveFetch("/api/admin/overview", { cache: "no-store" }),
      intensiveFetch("/api/admin/settings", { cache: "no-store" }),
    ])
      .then(async ([overviewResponse, settingsResponse]) => {
        const overviewPayload = await overviewResponse.json();
        const settingsPayload = await settingsResponse.json();

        if (
          overviewResponse.status === 401 || overviewResponse.status === 403 ||
          settingsResponse.status === 401 || settingsResponse.status === 403
        ) {
          window.location.replace("/");
          return;
        }

        if (!overviewResponse.ok) throw new Error(overviewPayload.message || "تعذر تحميل المواد.");
        setData({ courses: overviewPayload.courses ?? [] });

        if (settingsResponse.ok) {
          const defaults = (settingsPayload.settings ?? {}) as ExamDefaults;
          setForm((current) => ({
            ...current,
            sectionDurations: {
              Grammar: Number(defaults.default_section_minutes ?? current.sectionDurations.Grammar),
              Vocabulary: Number(defaults.default_section_minutes ?? current.sectionDurations.Vocabulary),
              Reading: Number(defaults.default_section_minutes ?? current.sectionDurations.Reading),
            },
            attemptsAllowed: Number(defaults.default_attempts ?? current.attemptsAllowed),
            resultRelease: defaults.default_result_release ?? current.resultRelease,
          }));
        }
      })
      .catch(() => setNotice("تعذر تحميل بيانات لوحة المدير."));
  }, []);

  const selectedCourse = useMemo(
    () => data?.courses.find((course) => course.id === form.courseId) ?? null,
    [data, form.courseId],
  );

  const stepReady = useMemo(() => {
    if (step === 1) return Boolean(form.courseId && form.title.trim().length >= 2);
    if (step === 2) return Boolean(form.startsAt && form.endsAt && new Date(form.endsAt).getTime() > new Date(form.startsAt).getTime());
    return true;
  }, [step, form]);

  async function createExam(event: FormEvent) {
    event.preventDefault();
    if (step < 4) {
      if (stepReady) setStep((current) => Math.min(4, current + 1));
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: riyadhLocalToIso(form.startsAt),
          endsAt: riyadhLocalToIso(form.endsAt),
          durationMinutes:
            form.sectionDurations.Grammar +
            form.sectionDurations.Vocabulary +
            form.sectionDurations.Reading,
          sectionDurations: form.sectionDurations,
          skills: ["Grammar", "Vocabulary", "Reading"],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إنشاء الاختبار.");
      const id = payload.result?.exam_id;
      if (!id) throw new Error("تم الإنشاء لكن تعذر فتح صفحة الاختبار.");
      window.location.href = "/admin/exams/" + id;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر إنشاء الاختبار.");
      setSubmitting(false);
    }
  }

  if (!data && !notice) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6fa] text-[#1F2B5E]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 animate-spin" />
          <div className="font-black">جاري تجهيز منشئ الاختبار...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#6f7488]">
            <ArrowRight size={17} /> العودة للوحة المدير
          </a>
          <NumoBrand className="w-24" />
        </div>

        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#273976] to-[#6366F1] p-7 text-white shadow-[0_25px_70px_rgba(31,43,94,.22)] sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]"><Sparkles size={16} /> منشئ الاختبارات</div>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">إنشاء اختبار جديد</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                أربع خطوات فقط. سيُنشأ الاختبار تلقائيا بثلاثة أقسام: Grammar وVocabulary وReading.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center">
              <div className="text-3xl font-black">{step}/4</div>
              <div className="text-xs text-white/60">الخطوة الحالية</div>
            </div>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {["المقرر", "الجدولة", "السياسات", "المراجعة"].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const done = step > number;
            return (
              <button key={label} type="button" onClick={() => done && setStep(number)} className={"rounded-xl border px-2 py-3 text-xs font-black transition " + (active ? "border-[#6366F1] bg-[#6366F1] text-white" : done ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-[#e2dee8] bg-white text-[#8a8e9f]")}>
                {done ? <CheckCircle2 className="mx-auto mb-1" size={15} /> : <span className="mb-1 block">{number}</span>}
                {label}
              </button>
            );
          })}
        </div>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{notice}</div>
        ) : null}

        <form onSubmit={createExam} className="mt-5 rounded-[1.8rem] border border-[#e2dee8] bg-white p-5 shadow-[0_15px_45px_rgba(31,43,94,.06)] sm:p-7">
          {step === 1 ? (
            <div>
              <div className="mb-5">
                <div className="text-xs font-black text-[#B1785C]">الخطوة 1</div>
                <h2 className="mt-1 text-2xl font-black">اختر المقرر واسم الاختبار</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(data?.courses ?? []).filter((course) => course.is_active).map((course) => {
                  const visual = courseVisual(course.code);
                  const active = form.courseId === course.id;
                  return (
                    <button key={course.id} type="button" onClick={() => setForm({ ...form, courseId: course.id })} className={"overflow-hidden rounded-2xl border text-right transition " + (active ? "border-[#6366F1] ring-4 ring-[#6366F1]/10" : "border-[#e5e1e9] hover:border-[#c9c3d2]")}>
                      <div className="h-28 overflow-hidden"><img src={courseCover(course.code, course.default_cover_url)} alt={course.code} className="h-full w-full object-cover" /></div>
                      <div className="p-4">
                        <div dir="ltr" className="font-black">{course.code}</div>
                        <div className="mt-1 text-xs font-bold text-[#808496]">{visual.level} · {visual.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black">اسم الاختبار</span>
                  <input className="field" placeholder="مثال: EL111 Midterm — Model 1" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black">التصنيف</span>
                  <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {["QUIZ 1","QUIZ 2","MIDTERM","FINAL","MOCK EXAM","PRACTICE EXAM","CUSTOM"].map((item)=><option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-black">وصف اختياري</span>
                <textarea className="field min-h-24" placeholder="ملاحظات للمدير عن الاختبار..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="mb-5">
                <div className="text-xs font-black text-[#B1785C]">الخطوة 2</div>
                <h2 className="mt-1 text-2xl font-black">حدد وقت إتاحة الاختبار</h2>
                <p className="mt-2 text-sm text-[#777c8f]">جميع الأوقات بتوقيت الرياض UTC+3.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black">يفتح في</span>
                  <input className="field" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black">يغلق في</span>
                  <input className="field" type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </label>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e8e4ec] bg-[#faf9fb] p-5">
                <div className="flex items-center gap-2 font-black"><CalendarClock size={19} className="text-[#6366F1]" /> توقيت الأقسام</div>
                <p className="mt-2 text-sm leading-7 text-[#777c8f]">
                  يملك مدير النظام صلاحية تحديد مدة مستقلة لكل Section. يبدأ المؤقت فقط عندما يختار الطالب فتح ذلك القسم.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {(["Grammar","Vocabulary","Reading"] as const).map((section) => (
                    <label key={section} className="block rounded-2xl border border-[#e5e1e9] bg-white p-4">
                      <span dir="ltr" className="mb-2 block text-sm font-black">{section}</span>
                      <div className="flex items-center gap-2">
                        <input
                          className="field"
                          type="number"
                          min={1}
                          max={240}
                          value={form.sectionDurations[section]}
                          onChange={(e)=>setForm({
                            ...form,
                            sectionDurations: {
                              ...form.sectionDurations,
                              [section]: Number(e.target.value),
                            },
                          })}
                        />
                        <span className="text-xs font-bold text-[#818596]">دقيقة</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-white px-5 py-3 text-center shadow-sm">
                  <div className="text-2xl font-black">
                    {form.sectionDurations.Grammar + form.sectionDurations.Vocabulary + form.sectionDurations.Reading}
                  </div>
                  <div className="text-[11px] text-[#818596]">إجمالي وقت الأقسام</div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <div className="mb-5">
                <div className="text-xs font-black text-[#B1785C]">الخطوة 3</div>
                <h2 className="mt-1 text-2xl font-black">المحاولات وإظهار النتيجة</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block rounded-2xl border border-[#e7e3eb] p-5">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black"><Clock3 size={18} className="text-[#6366F1]" /> عدد المحاولات</span>
                  <input className="field" type="number" min={1} max={20} value={form.attemptsAllowed} onChange={(e)=>setForm({...form,attemptsAllowed:Number(e.target.value)})} />
                  <span className="mt-2 block text-xs text-[#7f8496]">تم تحميل القيمة الافتراضية من إعدادات النظام ويمكن تعديلها لهذا الاختبار.</span>
                </label>
                <label className="block rounded-2xl border border-[#e7e3eb] p-5">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black"><ShieldCheck size={18} className="text-[#B1785C]" /> إظهار النتيجة</span>
                  <select className="field" value={form.resultRelease} onChange={(e)=>setForm({...form,resultRelease:e.target.value})}>
                    <option value="IMMEDIATE">مباشرة بعد التسليم</option>
                    <option value="AFTER_END">بعد إغلاق الاختبار</option>
                    <option value="MANUAL">يدويا من المدير</option>
                  </select>
                </label>
              </div>
              <div className="mt-5">
                <div className="mb-3 text-sm font-black">الأقسام التي ستُنشأ تلقائيا</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["Grammar","Vocabulary","Reading"] as const).map((item,index)=>(
                    <div key={item} className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-4">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1F2B5E] text-xs font-black text-white">{index+1}</div>
                      <div className="mt-3 text-lg font-black" dir="ltr">{item}</div>
                      <div className="mt-1 text-xs text-[#818596]">{form.sectionDurations[item]} دقيقة · {form.attemptsAllowed} محاولات</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <div className="mb-5">
                <div className="text-xs font-black text-[#B1785C]">الخطوة 4</div>
                <h2 className="mt-1 text-2xl font-black">راجع ثم أنشئ الاختبار</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
                <div className="overflow-hidden rounded-2xl border border-[#e4e0e9]">
                  {selectedCourse ? <img src={courseCover(selectedCourse.code, selectedCourse.default_cover_url)} alt={selectedCourse.code} className="h-40 w-full object-cover" /> : null}
                  <div className="p-4">
                    <div dir="ltr" className="text-xl font-black">{selectedCourse?.code ?? "—"}</div>
                    <div className="mt-1 text-xs text-[#7f8496]">{selectedCourse ? courseVisual(selectedCourse.code).label : "لم يتم اختيار مقرر"}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e4e0e9] bg-[#faf9fb] p-5">
                  {[
                    ["اسم الاختبار", form.title || "—"],
                    ["التصنيف", form.category],
                    ["وقت البداية", form.startsAt || "—"],
                    ["وقت الإغلاق", form.endsAt || "—"],
                    ["الأقسام", "Grammar · Vocabulary · Reading"],
                    ["توقيت الأقسام", "Grammar " + form.sectionDurations.Grammar + " · Vocabulary " + form.sectionDurations.Vocabulary + " · Reading " + form.sectionDurations.Reading + " دقيقة"],
                    ["المحاولات", String(form.attemptsAllowed)],
                    ["النتيجة", form.resultRelease === "IMMEDIATE" ? "مباشرة" : form.resultRelease === "AFTER_END" ? "بعد الإغلاق" : "يدوية"],
                  ].map(([label,value])=>(
                    <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9e5ed] py-3 last:border-0">
                      <span className="text-sm text-[#777c8f]">{label}</span>
                      <strong className="text-sm">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                بعد الإنشاء ستنتقل مباشرة إلى صفحة إدارة الاختبار لإضافة الأسئلة أو سحبها من بنك الأسئلة.
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8ef] pt-5">
            <button type="button" disabled={step === 1 || submitting} onClick={() => setStep((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-5 py-3 text-sm font-black disabled:opacity-40">
              <ChevronRight size={17} /> السابق
            </button>
            {step < 4 ? (
              <button type="submit" disabled={!stepReady} className="btn min-w-[150px]">
                التالي <ChevronLeft size={17} />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn min-w-[200px]">
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <Rocket size={17} />}
                {submitting ? "جاري الإنشاء..." : "إنشاء الاختبار"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
