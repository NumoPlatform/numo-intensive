import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { GraduationCap, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";

export default function DemoLanding() {
  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-8 text-[#1F2B5E]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-[#e3dfe9] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1F2B5E]">
              <img src="/icon.svg" alt="شعار منصة نمو" className="h-9 w-9" />
            </div>
            <div>
              <div className="font-black">منصة نمو</div>
              <div className="text-[10px] font-bold tracking-[.1em] text-[#B1785C]" dir="ltr">{BRAND.nameEn}</div>
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">نسخة تجريبية</div>
        </header>

        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1F2B5E] via-[#2d3e7d] to-[#6366F1] p-8 text-white shadow-[0_28px_80px_rgba(31,43,94,.25)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black">
            <Sparkles size={16} /> تجربة {BRAND.nameAr}
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.45] sm:text-5xl">جرّب واجهة الطالب ولوحة تحكم المدير.</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/75">
            الاختبارات مقسمة إلى Grammar وVocabulary وReading، ولكل قسم 30 دقيقة و4 محاولات مستقلة مع نتيجة مباشرة ومراجعة الأخطاء.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-black">
            <span className="rounded-full bg-white/10 px-4 py-2">3 أقسام</span>
            <span className="rounded-full bg-white/10 px-4 py-2">4 محاولات لكل قسم</span>
            <span className="rounded-full bg-white/10 px-4 py-2">30 دقيقة</span>
            <span className="rounded-full bg-white/10 px-4 py-2">مراجعة مباشرة</span>
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <Link href="/demo/student" className="group rounded-[1.8rem] border border-[#e3dfe9] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fbf1ec] text-[#B1785C]"><GraduationCap size={29} /></div>
            <div className="mt-6 text-xs font-black tracking-[.12em] text-[#B1785C]">واجهة الطالب</div>
            <h2 className="mt-2 text-2xl font-black">تجربة بوابة الطالب</h2>
            <p className="mt-3 leading-7 text-[#72778a]">شاهد المقررات، الأقسام، المحاولات والنتائج بالطريقة التي سيستخدمها الطالب فعليا.</p>
          </Link>

          <Link href="/demo/admin" className="group rounded-[1.8rem] border border-[#e3dfe9] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f0f1ff] text-[#6366F1]"><LayoutDashboard size={27} /></div>
            <div className="mt-6 text-xs font-black tracking-[.12em] text-[#B1785C]">لوحة المدير</div>
            <h2 className="mt-2 text-2xl font-black">تجربة مركز التحكم</h2>
            <p className="mt-3 leading-7 text-[#72778a]">استعرض إدارة المقررات والطلاب والاختبارات والأسئلة وإعدادات الوصول من جهاز واحد.</p>
          </Link>
        </section>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#e3dfe9] bg-white p-5 text-sm text-[#6e7387]">
          <ShieldCheck className="text-[#6366F1]" size={20} />
          نشاط النسخة التجريبية محلي داخل المتصفح ولا يعدّل بيانات الطلاب الفعلية.
        </div>
      </div>
    </main>
  );
}
