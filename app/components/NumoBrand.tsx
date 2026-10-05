import Image from "next/image";

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
      className={
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] " +
        (inverse
          ? "border border-white/15 bg-white shadow-[0_12px_35px_rgba(5,12,38,.22)]"
          : "border border-[#e7e1dc] bg-white shadow-[0_12px_35px_rgba(31,43,94,.10)]")
      }
    >
      <Image
        src="/brand/numo-platform-official.png"
        alt="منصة نمو — NUMO Platform"
        width={1268}
        height={1215}
        priority={priority}
        sizes="(max-width: 640px) 128px, 160px"
        className={"h-auto object-contain " + className}
      />
    </span>
  );
}
