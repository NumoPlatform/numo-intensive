type NumoBrandProps = {
  className?: string;
  priority?: boolean;
  inverse?: boolean;
  horizontal?: boolean;
};

export default function NumoBrand({
  className = "w-36",
  priority = false,
  inverse = false,
  horizontal = false,
}: NumoBrandProps) {
  return (
    <span
      data-priority={priority || undefined}
      className={
        "numo-metal-border inline-flex shrink-0 items-center justify-center overflow-visible rounded-[1.15rem] bg-white " +
        (inverse
          ? "border border-white/15 shadow-[0_12px_35px_rgba(5,12,38,.22)]"
          : "border border-[#e7e1dc] shadow-[0_12px_35px_rgba(31,43,94,.10)]") +
        (horizontal ? " gap-1.5 px-2 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2.5 " : " px-2 py-2 ") +
        className
      }
      aria-label="منصة نُمُو — NUMO Platform"
    >
      {horizontal ? (
        <>
          <svg viewBox="0 0 100 78" role="img" aria-hidden="true" className="h-auto w-10 shrink-0 sm:w-14">
            <path d="M12 27 50 6l38 21-18 11-20-11-20 11Z" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
            <path d="M30 35 50 23l20 12v23L50 71 30 58Z" fill="#fff" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
            <path d="m45 40 16 9-16 9Z" fill="#B1785C" />
            <path d="M12 28v25" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="6" />
            <circle cx="12" cy="55" r="4.5" fill="#1F2B5E" />
            <path d="M12 59v9" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="5" />
          </svg>
          <span className="min-w-0 text-right">
            <span className="numo-crisp-arabic block whitespace-nowrap text-[.94rem] font-black text-[#1F2B5E] sm:text-[1.06rem]">منصة نُمُو</span>
            <span className="mt-0.5 block whitespace-nowrap text-[.54rem] font-extrabold tracking-[.10em] text-[#A56A4D] sm:mt-1 sm:text-[.65rem] sm:tracking-[.12em]" dir="ltr">NUMO PLATFORM</span>
          </span>
        </>
      ) : (
        <span className="flex w-full flex-col items-center text-center">
          <svg viewBox="0 0 100 78" role="img" aria-hidden="true" className="h-auto w-[62%]">
            <path d="M12 27 50 6l38 21-18 11-20-11-20 11Z" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
            <path d="M30 35 50 23l20 12v23L50 71 30 58Z" fill="#fff" stroke="#1F2B5E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
            <path d="m45 40 16 9-16 9Z" fill="#B1785C" />
            <path d="M12 28v25" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="6" />
            <circle cx="12" cy="55" r="4.5" fill="#1F2B5E" />
            <path d="M12 59v9" fill="none" stroke="#1F2B5E" strokeLinecap="round" strokeWidth="5" />
          </svg>
          <span className="numo-crisp-arabic mt-1 whitespace-nowrap text-[.78rem] font-black text-[#1F2B5E]">منصة نُمُو</span>
          <span className="mt-0.5 whitespace-nowrap text-[.47rem] font-extrabold tracking-[.12em] text-[#A56A4D]" dir="ltr">NUMO PLATFORM</span>
        </span>
      )}
    </span>
  );
}
