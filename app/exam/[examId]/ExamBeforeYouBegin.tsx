"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  Info,
  ListChecks,
  Loader2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

type ExamSummary = {
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  attempts_allowed: number;
};

type SectionSummary = {
  id: string;
  title: string;
  position: number;
  timeLimitMinutes: number;
};

type Props = {
  exam: ExamSummary | null;
  sections: SectionSummary[];
  beforeStart: boolean;
  afterEnd: boolean;
  starting: boolean;
  message: string;
  onStart: () => void;
};

const journey = [
  {
    step: "01",
    title: "اقرأ بتركيز",
    subtitle: "خذ وقتك في فهم السؤال قبل اختيار الإجابة.",
  },
  {
    step: "02",
    title: "اختر بثقة",
    subtitle: "حدّد الإجابة مرة واحدة؛ سيُحفظ اختيارك ويظهر تصحيحه مباشرة.",
  },
  {
    step: "03",
    title: "تعلّم وتقدّم",
    subtitle: "راجع السبب عند الخطأ، ثم أكمل الأسئلة واستفد من محاولاتك.",
  },
];

function dateInRiyadh(date: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(date));
}

export default function ExamBeforeYouBegin({
  exam,
  sections,
  beforeStart,
  afterEnd,
  starting,
  message,
  onStart,
}: Props) {
  const unlimited = exam?.attempts_allowed === 0;
  const hasWriting = sections.some((section) => /writing|كتابة|essay/i.test(section.title));
  const hasReading = sections.some((section) => /reading|passage|قراءة|قطع/i.test(section.title));
  const hasIndependentTimers = sections.length > 1;
  const cannotStart = starting || !exam || beforeStart || afterEnd;
  const startLabel = starting
    ? "نجهّز الاختبار من أجلك..."
    : beforeStart
      ? "الاختبار لم يبدأ بعد"
      : afterEnd
        ? "انتهت فترة إتاحة الاختبار"
        : "جاهز! ابدأ الاختبار";

  return (
    <section
      dir="rtl"
      aria-labelledby="exam-guide-title"
      className="overflow-hidden rounded-[1.6rem] border border-[#e6e1df] bg-white text-right shadow-[0_22px_65px_rgba(31,43,94,.09)] sm:rounded-[2rem]"
    >
      <div aria-hidden="true" className="h-1.5 bg-[linear-gradient(90deg,#1F2B5E,#6366F1_58%,#B1785C)]" />
      <header className="relative overflow-hidden bg-[#1F2B5E] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-14 -top-24 h-52 w-52 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-5 -top-16 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B1785C]/60 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#f2c8b0]">
              <Sparkles size={14} aria-hidden="true" />
              تجربة نُمو التعليمية
            </span>
            <span dir="ltr" className="text-[10px] font-black tracking-[.15em] text-[#efc5ad]">NUMO · ACADEMIC SIMULATOR</span>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#f3c6aa] sm:h-14 sm:w-14">
              <GraduationCap size={29} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <h1 id="exam-guide-title" className="text-2xl font-black leading-normal sm:text-3xl">
                مستعدّ تتحدى نفسك؟
              </h1>
              <p className="mt-1 text-sm font-semibold leading-7 text-[#e6eaf7]">
                كل سؤال فرصة لتفهم أكثر وتتقدم بثقة. ابدأ بهدوء، واستمتع بتجربتك!
              </p>
            </div>
          </div>
          <p dir="auto" className="mt-4 rounded-xl border border-white/15 bg-white/[.07] px-3 py-2.5 text-sm font-black leading-6 text-white">
            {exam?.title ?? "اختبار محاكي نُمو الأكاديمي"}
          </p>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-7 sm:py-7">
        <div className="grid grid-cols-2 gap-3" aria-label="معلومات الاختبار">
          <div className="rounded-2xl border border-[#e4e5f0] bg-[#f7f8fd] p-3.5">
            <span className="flex items-center gap-2 text-xs font-bold text-[#686f84]">
              <Clock3 size={17} className="text-[#6366F1]" aria-hidden="true" />
              الوقت
            </span>
            <strong className="mt-1.5 block text-sm font-black leading-6 text-[#1F2B5E]">
              {hasIndependentTimers ? "مؤقّت مستقل لكل قسم" : exam ? `${exam.duration_minutes} دقيقة` : "حسب الاختبار"}
            </strong>
          </div>
          <div className="rounded-2xl border border-[#eeded3] bg-[#fdf8f3] p-3.5">
            <span className="flex items-center gap-2 text-xs font-bold text-[#686f84]">
              <RotateCcw size={17} className="text-[#B1785C]" aria-hidden="true" />
              المحاولات
            </span>
            <strong className="mt-1.5 block text-sm font-black leading-6 text-[#1F2B5E]">
              {unlimited ? "مفتوحة بلا حد" : exam ? `${exam.attempts_allowed} محاولات` : "حسب الاختبار"}
            </strong>
          </div>
        </div>

        <section aria-labelledby="exam-journey-title">
          <h2 id="exam-journey-title" className="mb-3 flex items-center gap-2 text-base font-black text-[#1F2B5E]">
            <Target size={19} className="text-[#B1785C]" aria-hidden="true" />
            ثلاث خطوات… وتبدأ رحلتك!
          </h2>
          <div className="space-y-2.5">
            {journey.map((item) => (
              <div key={item.step} className="flex items-start gap-3 rounded-xl border border-[#e8e6ec] bg-[#fdfdfd] px-3 py-3">
                <span dir="ltr" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf0f9] text-sm font-black text-[#1F2B5E]">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[#1F2B5E]">{item.title}</h3>
                  <p className="mt-0.5 text-[13px] font-medium leading-6 text-[#646c7e]">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="طريقة حل الأسئلة" className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#dfe2f1] bg-[#f8f9fe] p-4">
            <div className="flex items-center gap-2 text-[#1F2B5E]">
              <ListChecks size={19} className="text-[#6366F1]" aria-hidden="true" />
              <h2 dir="auto" className="text-sm font-black">MCQs · اختيار من متعدد</h2>
            </div>
            <p className="mt-2 text-[13px] font-medium leading-7 text-[#535d72]">
              افهم المطلوب، قارن الخيارات، ثم اختر الأنسب. سيظهر التصحيح مباشرة؛ فاقرأ التفسير واستفد منه.
            </p>
          </div>
          <div className="rounded-2xl border border-[#eaded7] bg-[#fffaf6] p-4">
            <div className="flex items-center gap-2 text-[#1F2B5E]">
              <CheckCircle2 size={19} className="text-[#B1785C]" aria-hidden="true" />
              <h2 dir="auto" className="text-sm font-black">True / False · صح أو خطأ</h2>
            </div>
            <p className="mt-2 text-[13px] font-medium leading-7 text-[#535d72]">
              تحقق من العبارة كاملة، وانتبه لكلمات النفي والتعميم. اختر صح أو خطأ وفق المعنى والدليل.
            </p>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-[#dfebe3] bg-[#f5faf7] px-3.5 py-3 text-xs font-semibold leading-6 text-[#315f4f]">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>تُحفظ الإجابات عند اختيارها، ولا يتغير الاختيار بعد التصحيح في المحاولة نفسها. عند الرجوع يستمر وقت القسم؛ تأكد من الحفظ أولًا.</span>
        </div>

        <div className="rounded-2xl border border-[#eddfd6] bg-[#fffbf7] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f7e9df] text-[#B1785C]">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-[#1F2B5E]">أنت جاهز… انطلق بثقة!</h2>
              <p className="mt-1 text-[13px] font-medium leading-6 text-[#696f80]">
                ليس المطلوب أن تعرف كل شيء؛ بل أن تتعلّم شيئًا جديدًا من كل محاولة.
              </p>
            </div>
          </div>
          {message ? (
            <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800">
              {message}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            disabled={cannotStart}
            className="group mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2B5E] px-4 py-3 text-center text-sm font-black text-white shadow-[0_11px_26px_rgba(31,43,94,.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#293976] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none sm:text-base"
          >
            {starting ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            {startLabel}
            {!starting && !beforeStart && !afterEnd ? <ArrowLeft size={18} aria-hidden="true" /> : null}
          </button>
        </div>

        <details className="group rounded-xl border border-[#e6e5eb] bg-white px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-black text-[#1F2B5E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><BookOpenCheck size={18} className="text-[#B1785C]" aria-hidden="true" /> هل تريد معرفة المزيد قبل البدء؟</span>
            <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 space-y-4 border-t border-[#eeecf0] pt-4 text-[13px] font-medium leading-7 text-[#596176]">
            <p><strong className="text-[#1F2B5E]">التنقل والتوقيت:</strong> اختر القسم المتاح، ثم حل أسئلته قبل انتهاء مؤقته. تظهر النتيجة بعد إتمام القسم حسب إعدادات الاختبار، ولا يتوقف العدّاد عند العودة للمادة.</p>
            {sections.length ? (
              <div className="rounded-xl bg-[#f7f8fc] p-3">
                <strong className="block text-[#1F2B5E]">الوقت المخصص لكل قسم:</strong>
                <div className="mt-1 space-y-1">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-start justify-between gap-2">
                      <span dir="auto">{section.title}</span>
                      <span className="shrink-0 font-black text-[#1F2B5E]">{section.timeLimitMinutes} دقيقة</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {hasReading ? <p><strong className="text-[#1F2B5E]">Reading:</strong> اقرأ القطعة جيدًا واستخرج الدليل من النص قبل الإجابة، ولا تعتمد على التخمين.</p> : null}
            {hasWriting ? <p><strong className="text-[#1F2B5E]">Writing:</strong> اختر الموضوع أولًا، واكتب العدد المطلوب من الكلمات، ثم سلّم النص للتقييم. انتظار التقييم الذكي لا يعني حصولك على صفر.</p> : null}
            <p><strong className="text-[#1F2B5E]">التصحيح:</strong> ستظهر الإجابة المعتمدة فورًا في الأسئلة الموضوعية. إن ورد تنبيه بشأن مفتاح التجميعات، فاقرأ الملاحظة الأكاديمية. وإذا تعذّر شرح الذكاء الاصطناعي، يمكنك متابعة اختبارك.</p>
            {exam ? <p className="flex items-start gap-2"><Info size={16} className="mt-1 shrink-0 text-[#6366F1]" aria-hidden="true" /> الإتاحة بتوقيت الرياض: {dateInRiyadh(exam.starts_at)} — {dateInRiyadh(exam.ends_at)}.</p> : null}
          </div>
        </details>

        <p dir="ltr" className="text-center text-[10px] font-black tracking-[.15em] text-[#a67f6d]">PREPARE · PRACTICE · PROGRESS</p>
      </div>
    </section>
  );
}
