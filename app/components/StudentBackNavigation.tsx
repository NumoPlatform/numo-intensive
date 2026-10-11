"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, ChevronLeft, BookOpenCheck } from "lucide-react";

type Props = {
  backHref: string;
  backLabel: string;
  context?: string;
  active?: boolean;
  busy?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  compact?: boolean;
};

export default function StudentBackNavigation({
  backHref,
  backLabel,
  context,
  active = false,
  busy = false,
  onBack,
  onHome,
  compact = false,
}: Props) {
  const buttonContent = (
    <>
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-[.8rem] border border-[#263973] bg-[#263973] text-white shadow-[0_5px_14px_rgba(31,43,94,.17)] transition-colors group-hover:bg-[#B1785C]">
        <ArrowRight size={19} strokeWidth={2.35} />
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-[9px] font-black uppercase tracking-[.12em] text-[#B1785C]" dir="ltr">
          BACK
        </span>
        <span className="block truncate text-sm font-black text-[#1F2B5E] sm:text-base">
          {backLabel}
        </span>
      </span>
    </>
  );
  const buttonClass = "group inline-flex min-h-[3.25rem] min-w-0 items-center gap-2.5 rounded-[1rem] border border-[#e6e1e8] bg-white px-2.5 py-1.5 text-[#1F2B5E] shadow-[0_5px_16px_rgba(31,43,94,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B1785C]/70 hover:shadow-[0_10px_26px_rgba(31,43,94,.12)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] motion-reduce:transform-none";
  return (
    <nav dir="rtl" aria-label="التنقل والعودة" className={"w-full rounded-[1.2rem] border border-[#e6e2e9] bg-white/95 p-2 shadow-[0_8px_28px_rgba(31,43,94,.065)] backdrop-blur-sm " + (compact ? "" : "sm:p-2.5")}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className={buttonClass + " disabled:cursor-wait disabled:opacity-60"}
            aria-label={backLabel}
          >
            {buttonContent}
          </button>
        ) : (
          <Link href={backHref} className={buttonClass} aria-label={backLabel}>
            {buttonContent}
          </Link>
        )}
        {context ? (
          <div className="hidden min-w-0 items-center gap-2 px-2 text-xs font-bold text-[#757c90] sm:inline-flex">
            <BookOpenCheck size={16} className="shrink-0 text-[#B1785C]" aria-hidden="true" />
            <span className="max-w-[15rem] truncate" dir="auto">{context}</span>
            <ChevronLeft size={13} className="shrink-0 text-[#B1785C]" aria-hidden="true" />
            <span className="shrink-0 text-[#1F2B5E]">{active ? "الاختبار" : "مُحاكي نُمو"}</span>
          </div>
        ) : null}
        {onHome ? (
          <button type="button" disabled={busy} onClick={onHome} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#e6e2e9] bg-[#f7f8fc] px-3 text-xs font-black text-[#1F2B5E] transition-colors hover:bg-[#ecedf7] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] disabled:opacity-60" aria-label="العودة إلى لوحة الطالب">
            <LayoutDashboard size={18} aria-hidden="true" />
            <span className="hidden sm:inline">لوحة الطالب</span>
          </button>
        ) : (
          <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#e6e2e9] bg-[#f7f8fc] px-3 text-xs font-black text-[#1F2B5E] transition-colors hover:bg-[#ecedf7] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]" aria-label="العودة إلى لوحة الطالب">
            <LayoutDashboard size={18} aria-hidden="true" />
            <span className="hidden sm:inline">لوحة الطالب</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
