"use client";

import {
  ArrowLeft,
  BookMarked,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FilePenLine,
  GraduationCap,
  Info,
  Lightbulb,
  ListChecks,
  Loader2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  X,
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

const steps = [
  {
    number: "01",
    title: "تهيئة نفسك للاختبار",
    text: "اختر مكانًا هادئًا، وتأكد من اتصال الإنترنت وشحن الجهاز. اقرأ عنوان الاختبار والأقسام والوقت المتاح والمحاولات قبل الدخول؛ فالتنظيم الجيد يساعدك على التركيز والتعامل بهدوء مع كل سؤال.",
  },
  {
    number: "02",
    title: "اختيار القسم المناسب",
    text: "بعد الضغط على زر الدخول، ستظهر لك الأقسام المتاحة مثل Grammar وVocabulary وReading وWriting بحسب مقررِك. افتح القسم الذي تريد مراجعته واقرأ تعليماته؛ لكل قسم توقيته الخاص، ويمكنك الرجوع إلى صفحة المادة من زر العودة.",
  },
  {
    number: "03",
    title: "الحل ثم مراجعة التصحيح",
    text: "اقرأ السؤال كاملًا وحدد إجابتك. في أسئلة الاختيار من متعدد والصح والخطأ تُحفظ الإجابة ثم يظهر التصحيح المباشر وفق المفتاح المعتمد. إذا كانت الإجابة خاطئة فاقرأ التصحيح والشرح المتوفر، ثم انتقل للسؤال التالي.",
  },
  {
    number: "04",
    title: "تسليم القسم ومتابعة نتيجتك",
    text: "بعد الانتهاء من الأسئلة اضغط زر إنهاء القسم أو تسليمه، وراجع درجتك وملاحظاتك. عند إكمال الأقسام اللازمة يمكنك متابعة النتيجة الإجمالية حسب إعداد الاختبار. وتستطيع التدرب من جديد عندما تسمح المحاولات بذلك.",
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
  const hasWriting = sections.some((section) =>
    /writing|كتابة|essay/i.test(section.title),
  );
  const hasReading = sections.some((section) =>
    /reading|passage|قراءة|قطع/i.test(section.title),
  );
  const cannotStart = starting || !exam || beforeStart || afterEnd;
  const startLabel = starting
    ? "جاري تجهيز الأقسام..."
    : beforeStart
      ? "لم يبدأ وقت إتاحة الاختبار بعد"
      : afterEnd
        ? "انتهت فترة إتاحة الاختبار"
        : "فهمت التعليمات — الدخول إلى الاختبار";

  return (
    <section dir="rtl" aria-labelledby="exam-guide-title" className="overflow-hidden rounded-[1.75rem] border border-[#e6e0db] bg-[#fffefd] text-right shadow-[0_25px_90px_rgba(31,43,94,.10)] sm:rounded-[2rem]">
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,#1F2B5E_0%,#6366F1_55%,#B1785C_100%)]" aria-hidden="true" />

      <header className="relative overflow-hidden bg-[#1F2B5E] px-5 pb-8 pt-8 text-white sm:px-9 sm:pb-10 sm:pt-10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-9 -top-12 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b1785c]/55 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#f6d2bd]">
              <Sparkles size={15} aria-hidden="true" />
              الدليل الأكاديمي للطالب
            </span>
            <span className="text-[10px] font-black tracking-[.19em] text-[#e4bb9f]" dir="ltr">NUMO · STUDENT EXAM GUIDE</span>
          </div>
          <div className="mt-7 flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.05rem] border border-white/20 bg-white/10 text-[#f3c6aa] sm:h-16 sm:w-16">
              <GraduationCap size={33} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#efc7b3]">استعد بثقة · تعلّم بفهم · تقدّم بتميّز</p>
              <h1 id="exam-guide-title" className="mt-2 text-2xl font-black leading-[1.6] sm:text-4xl">
                قبل أن تبدأ اختبارك
              </h1>
              <p className="mt-2 text-[13px] font-semibold leading-8 text-[#e7eaf6] sm:text-base">
                أهلًا بك في محاكي نُمو الأكاديمي. هذه الصفحة دليلك لفهم تجربة الاختبار،
                من اختيار القسم إلى تفسير الإجابات ومراجعة النتيجة. اقرأها بعناية؛
                فالهدف ليس الإجابة فقط، بل اكتساب المعرفة وتثبيت المعلومة.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-white/15 bg-white/[.075] px-4 py-3">
            <span className="block text-xs font-bold text-[#e9c2ad]">الاختبار الذي تستعد له</span>
            <strong className="mt-1 block text-base font-black leading-7 text-white sm:text-xl" dir="auto">{exam?.title ?? "محاكي نُمو الأكاديمي"}</strong>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-4 pb-7 pt-6 sm:px-8 sm:pb-9 sm:pt-8">
        <section aria-labelledby="guide-facts">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-[#B1785C]" aria-hidden="true" />
            <h2 id="guide-facts" className="text-lg font-black text-[#1F2B5E] sm:text-xl">تفاصيل الاختبار قبل الدخول</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e5e4ee] bg-[#f6f7fc] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#6366F1]"><Timer size={19} /><strong className="text-sm text-[#1F2B5E]">المدة الزمنية</strong></div>
              <p className="text-sm font-bold leading-7 text-[#545c73]">
                {sections.length > 1 ? "لكل قسم وقت مستقل يبدأ عند فتح محاولته." : exam ? `${exam.duration_minutes} دقيقة وفق إعداد الاختبار.` : "تحقق من المدة قبل البدء."}
              </p>
              {sections.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-[#dedfeb] pt-3">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-start justify-between gap-2 text-xs leading-6 text-[#5e6680]">
                      <span className="min-w-0 font-semibold" dir="auto">{section.title}</span>
                      <strong className="shrink-0 text-[#1F2B5E]">{section.timeLimitMinutes} دقيقة</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[#eee3dc] bg-[#fcf7f3] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#B1785C]"><RotateCcw size={19} /><strong className="text-sm text-[#1F2B5E]">المحاولات وفترة الإتاحة</strong></div>
              <p className="text-sm font-bold leading-7 text-[#545c73]">
                {unlimited ? "محاولات التدريب مفتوحة دون حد أقصى خلال فترة الإتاحة." : `عدد المحاولات المسموح: ${exam?.attempts_allowed ?? "—"}.`}
              </p>
              {exam ? (
                <p className="mt-2 text-xs font-semibold leading-7 text-[#757b8a]">
                  متاح من {dateInRiyadh(exam.starts_at)} حتى {dateInRiyadh(exam.ends_at)} بتوقيت الرياض.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section aria-labelledby="guide-steps">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-[#B1785C]" aria-hidden="true" />
            <h2 id="guide-steps" className="text-lg font-black text-[#1F2B5E] sm:text-xl">رحلتك داخل الاختبار خطوة بخطوة</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <article key={step.number} className="relative rounded-2xl border border-[#e6e4ea] bg-white p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0f1fa] text-sm font-black text-[#1F2B5E]" dir="ltr">{step.number}</span>
                  <h3 className="text-sm font-black leading-6 text-[#1F2B5E]">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm font-medium leading-[2.05] text-[#5b6173]">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="guide-objective" className="rounded-[1.35rem] border border-[#dddfee] bg-[#fbfbff] p-4 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9ebff] text-[#4f56bf]">
              <ListChecks size={23} />
            </div>
            <div>
              <h2 id="guide-objective" className="text-lg font-black leading-7 text-[#1F2B5E]">طريقة حل أسئلة الاختيار من متعدد (MCQs)</h2>
              <p className="mt-1 text-sm leading-7 text-[#62697d]">تعامل مع السؤال بوصفه تدريبًا على الفهم والتحليل، لا اختيارًا عشوائيًا.</p>
            </div>
          </div>
          <ol className="list-decimal space-y-3 pr-5 text-sm font-medium leading-[2.05] text-[#4c556e] marker:font-black marker:text-[#B1785C]">
            <li><strong className="text-[#1F2B5E]">اقرأ رأس السؤال بالكامل:</strong> انتبه للكلمات الحاسمة مثل <span dir="ltr" className="font-bold">NOT, EXCEPT, BEST, MOST</span>، فهي قد تغيّر المطلوب من اختيار الصحيح إلى تحديد الاستثناء.</li>
            <li><strong className="text-[#1F2B5E]">فكّر في الإجابة قبل مشاهدة البدائل:</strong> استحضر القاعدة أو المعنى أو الدليل من القطعة؛ لتقلل تأثير الخيارات المتشابهة والمضللة.</li>
            <li><strong className="text-[#1F2B5E]">قارن جميع الخيارات:</strong> استبعد البديل الذي لا يتفق مع السياق أو القاعدة، ثم حدّد خيارًا واحدًا تعتقد أنه الأصح.</li>
            <li><strong className="text-[#1F2B5E]">اضغط الخيار بثقة:</strong> يتم حفظ اختيارك وتصحيحه فورًا حسب مفتاح الإجابة. <strong>بعد ظهور التصحيح، لا تستطيع تغيير إجابة السؤال داخل المحاولة نفسها.</strong></li>
            <li><strong className="text-[#1F2B5E]">اقرأ تفسير الخطأ:</strong> عند اختيار بديل غير صحيح، راجع الخيار الصحيح والشرح الأكاديمي المتاح، وافهم سبب صحة أحدهما وخطأ الآخر قبل الضغط على التالي.</li>
          </ol>
          <div className="mt-5 rounded-xl border border-[#d6dced] bg-white p-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-black text-[#B1785C]"><BookMarked size={15} /> مثال توضيحي فقط — لا يُحتسب في الدرجة</span>
            <p className="mt-3 font-bold leading-7 text-[#1F2B5E]" dir="ltr">She ____ to university every day.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3" dir="ltr">
              <div className="rounded-lg border border-[#e2e4ed] bg-[#f8f9fc] p-3 text-sm font-semibold text-[#596174]">A · go</div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-800">B · goes <CheckCircle2 className="ml-1 inline" size={15} /></div>
              <div className="rounded-lg border border-[#e2e4ed] bg-[#f8f9fc] p-3 text-sm font-semibold text-[#596174]">C · going</div>
            </div>
            <p className="mt-3 text-xs font-semibold leading-7 text-[#576073]">التفسير: الفاعل <span dir="ltr" className="font-bold">She</span> مفرد غائب، وفي المضارع البسيط نضيف عادةً <span dir="ltr" className="font-bold">-s</span> للفعل؛ لذا تُستخدم <span dir="ltr" className="font-bold">goes</span>. والفهم الصحيح للقاعدة هو أهم من تذكر حرف الخيار.</p>
          </div>
        </section>

        <section aria-labelledby="guide-true-false" className="rounded-[1.35rem] border border-[#e9dfd9] bg-[#fffbf8] p-4 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f8ece5] text-[#B1785C]">
              <ClipboardCheck size={23} />
            </div>
            <div>
              <h2 id="guide-true-false" className="text-lg font-black leading-7 text-[#1F2B5E]">طريقة حل أسئلة الصح والخطأ (True / False)</h2>
              <p className="mt-1 text-sm leading-7 text-[#62697d]">المطلوب الحكم على صحة العبارة كاملة، لا الاكتفاء بصحة جزء منها.</p>
            </div>
          </div>
          <ol className="list-decimal space-y-3 pr-5 text-sm font-medium leading-[2.05] text-[#4c556e] marker:font-black marker:text-[#B1785C]">
            <li><strong className="text-[#1F2B5E]">اقرأ العبارة كلمة كلمة:</strong> لاحظ النفي والمقارنة وكلمات التعميم مثل <span dir="ltr" className="font-bold">always, never, only, all</span>؛ فكلمة واحدة قد تغيّر الحكم.</li>
            <li><strong className="text-[#1F2B5E]">تحقق من الفكرة الأساسية:</strong> قارن العبارة بما درسته أو بما ورد صراحةً في القطعة، ولا تعتمد على التخمين أو المعلومة غير المذكورة.</li>
            <li><strong className="text-[#1F2B5E]">اختر True إذا كانت العبارة صحيحة بالكامل:</strong> واختر <span dir="ltr" className="font-bold">False</span> عندما تحتوي على معلومة خاطئة أو تناقض الدليل المتاح.</li>
            <li><strong className="text-[#1F2B5E]">راجع التصحيح فورًا:</strong> ستظهر نتيجة اختيارك والمفتاح المعتمد. وإذا أخطأت، راجع شرح موضع الخطأ ثم واصل بقية الأسئلة.</li>
          </ol>
          <div className="mt-5 rounded-xl border border-[#eaded8] bg-white p-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-black text-[#B1785C]"><Lightbulb size={15} /> مثال توضيحي فقط — لا يُحتسب في الدرجة</span>
            <p className="mt-3 font-bold text-[#1F2B5E]" dir="ltr">The sun rises in the west.</p>
            <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
              <div className="rounded-lg border border-[#e2e4ed] bg-[#f8f9fc] px-5 py-2 text-sm font-semibold text-[#596174]"><Check size={15} className="mr-1 inline" /> True</div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-black text-emerald-800"><X size={15} className="mr-1 inline" /> False · Correct</div>
            </div>
            <p className="mt-3 text-xs font-semibold leading-7 text-[#576073]">التفسير: العبارة خاطئة لأن الشمس تشرق من الشرق، وليس الغرب. لاحظ أننا حكمنا على المعلومة الأساسية نفسها؛ وهذه هي الطريقة الصحيحة مع عبارات True / False.</p>
          </div>
        </section>

        {hasReading || hasWriting ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {hasReading ? (
              <article className="rounded-2xl border border-[#e3e2ea] bg-white p-5">
                <BookOpenCheck className="mb-3 text-[#6366F1]" size={22} />
                <h3 className="font-black text-[#1F2B5E]">إذا احتوى الاختبار على قطع Reading</h3>
                <p className="mt-2 text-sm font-medium leading-[2] text-[#596174]">ابدأ بقراءة عنوان القطعة ونصها كاملًا. عند كل سؤال، ارجع إلى العبارة الداعمة داخل النص وحدد المعنى أو الفكرة الأساسية. لا تتسرع في الإجابة اعتمادًا على كلمة متشابهة فقط، ولا تضف إلى القطعة معلومات من خارجها.</p>
              </article>
            ) : null}
            {hasWriting ? (
              <article className="rounded-2xl border border-[#e3e2ea] bg-white p-5">
                <FilePenLine className="mb-3 text-[#B1785C]" size={22} />
                <h3 className="font-black text-[#1F2B5E]">إذا احتوى الاختبار على Writing</h3>
                <p className="mt-2 text-sm font-medium leading-[2] text-[#596174]">اختر موضوع الكتابة أولًا، ثم اكتب نصك بالإنجليزية وفق عدد الكلمات المطلوب في الشاشة. نظّم الأفكار وراجع القواعد والإملاء، ثم اضغط زر تسليم وتقييم الكتابة. قد ينتظر التقييم الذكي أو يُستكمل لاحقًا؛ ولا تعني حالة انتظار التقييم حصولك على صفر.</p>
              </article>
            ) : null}
          </div>
        ) : null}

        <section aria-labelledby="guide-notes" className="rounded-2xl border border-[#dce1ee] bg-[#f5f7fb] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#1F2B5E]" size={23} />
            <h2 id="guide-notes" className="text-base font-black text-[#1F2B5E]">إرشادات مهمة لحماية محاولتك</h2>
          </div>
          <div className="mt-4 grid gap-4 text-sm font-medium leading-[2] text-[#535c75] sm:grid-cols-2">
            <p><strong className="text-[#1F2B5E]">حفظ الإجابات:</strong> يحفظ النظام اختياراتك عند تحديدها ويعتمد التقدم المسجل. في Writing يُفضّل الانتظار حتى يظهر تأكيد الحفظ قبل مغادرة الصفحة.</p>
            <p><strong className="text-[#1F2B5E]">زر العودة:</strong> يمكنك العودة إلى المادة، لكن الوقت يستمر في القسم الجاري. سيظهر تنبيه وتُجرى محاولة لحفظ الإجابات قبل المغادرة.</p>
            <p><strong className="text-[#1F2B5E]">عند انتهاء الوقت:</strong> قد يُنهي النظام القسم تلقائيًا. تابع المؤقّت في أعلى الصفحة ولا تعتمد على العودة لاحقًا لتمديد المحاولة نفسها.</p>
            <p><strong className="text-[#1F2B5E]">عند انقطاع الاتصال:</strong> لا تُحدّث الصفحة مرات متتابعة. تحقّق من الاتصال وحالة الحفظ، ثم عُد إلى الاختبار من المادة عند الحاجة.</p>
          </div>
          <p className="mt-4 flex items-start gap-2 border-t border-[#dfe3ed] pt-4 text-xs font-semibold leading-7 text-[#666d80]">
            <Info className="mt-1 shrink-0 text-[#6366F1]" size={17} aria-hidden="true" />
            التصحيح الفوري يعكس مفتاح الإجابة المعتمد في بنك الأسئلة. بعض الأسئلة المنقولة من التجميعات قد تحتوي ملاحظات مصدرية؛ عند ظهورها اقرأ التنبيه الأكاديمي بدل اعتبار كل مفتاح قاعدة علمية مطلقة.
          </p>
        </section>

        <footer className="rounded-[1.35rem] border border-[#ead9ce] bg-[#fff9f4] px-4 py-6 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f6e7dc] text-[#B1785C]"><Target size={22} /></div>
              <div>
                <h2 className="text-lg font-black text-[#1F2B5E]">جاهز لتحويل معرفتك إلى إنجاز؟</h2>
                <p className="mt-1 text-sm font-medium leading-7 text-[#6b6c7e]">اقرأ السؤال بعناية، تعلّم من التصحيح، واستفد من كل محاولة لتطوير مستواك.</p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-black tracking-[.16em] text-[#B1785C]" dir="ltr">PREPARE • PRACTICE • PROGRESS</span>
          </div>
          {message ? (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-7 text-rose-800">{message}</div>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            disabled={cannotStart}
            className="group mt-5 flex min-h-[3.7rem] w-full items-center justify-center gap-3 rounded-2xl bg-[#1F2B5E] px-5 py-3 text-center text-base font-black text-white shadow-[0_12px_28px_rgba(31,43,94,.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#283975] hover:shadow-[0_16px_32px_rgba(31,43,94,.25)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
          >
            {starting ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}
            <span>{startLabel}</span>
            {!starting && !beforeStart && !afterEnd ? <ArrowLeft size={19} className="transition-transform group-hover:-translate-x-1 motion-reduce:transform-none" aria-hidden="true" /> : null}
          </button>
          <p className="mt-3 text-center text-xs font-semibold leading-6 text-[#73788a]">منصة نُمو · المحاكي الأكاديمي — التعلّم بفهم، والتقدّم بثقة.</p>
        </footer>
      </div>
    </section>
  );
}
