type NumoBrandProps = {
  className?: string;
  priority?: boolean;
  inverse?: boolean;
};

export default function NumoBrand({
  className = "w-36",
  priority = false,
  inverse = false,
}: NumoBrandProps) {
  return (
    <span
      data-priority={priority || undefined}
      className={
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] px-2 py-2 " +
        (inverse
          ? "border border-white/15 bg-white shadow-[0_12px_35px_rgba(5,12,38,.22)]"
          : "border border-[#e7e1dc] bg-white shadow-[0_12px_35px_rgba(31,43,94,.10)]") +
        " " + className
      }
      aria-label="منصة نمو — NUMO Platform"
    >
      <span className="flex w-full flex-col items-center text-center leading-none">
        <svg viewBox="0 0 100 78" role="img" aria-hidden="true" className="h-auto w-[62%]">
          <path d="M12 27 50 6l38 21-18 11-20-11-20 11Z" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
          <path d="M30 35 50 23l20 12v23L50 71 30 58Z" fill="#fff" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
          <path d="m45 40 16 9-16 9Z" fill="#BD8063" />
          <path d="M12 28v25" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="6" />
          <circle cx="12" cy="55" r="4.5" fill="#1F2B5E" />
          <path d="M12 59v9" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="5" />
        </svg>
        <span className="mt-1 whitespace-nowrap text-[.62rem] font-black tracking-tight text-[#1F2B5E]">منصة نمو</span>
        <span className="mt-1 whitespace-nowrap text-[.38rem] font-bold tracking-[.14em] text-[#BD8063]" dir="ltr">NUMO PLATFORM</span>
      </span>
    </span>
  );
}
