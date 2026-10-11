"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "numo-course-motion-opt-in";

/**
 * Accessibility: follow reduced-motion by default. If a student explicitly
 * requests the floating covers, allow an opt-in override for this device.
 * Never show the control on exams or admin pages.
 */
export default function NumoMotionOverride() {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const accepted = window.localStorage.getItem(STORAGE_KEY) === "yes";
    document.documentElement.classList.toggle("numo-motion-forced", accepted);
    setOptedIn(accepted);
    setReducedMotion(query.matches);

    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  function enableMotion() {
    window.localStorage.setItem(STORAGE_KEY, "yes");
    document.documentElement.classList.add("numo-motion-forced");
    setOptedIn(true);
  }

  if (!reducedMotion || optedIn || !(pathname === "/" || pathname?.startsWith("/course/"))) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={enableMotion}
      className="fixed bottom-5 right-4 z-[60] rounded-2xl border border-[#B1785C]/70 bg-[#1F2B5E] px-4 py-3 text-xs font-black text-white shadow-[0_12px_38px_rgba(8,16,49,.26)] sm:right-6"
      aria-label="تفعيل حركة الأغلفة رغم إعدادات تقليل الحركة في الجهاز"
    >
      تشغيل حركة أغلفة الدورات
    </button>
  );
}
