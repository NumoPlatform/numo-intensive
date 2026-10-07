import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import ResultHistoryPortal from "./ResultHistoryPortal";

export const metadata: Metadata = {
  title: "سجل النتائج",
  description: `سجل المحاولات والنتائج داخل ${BRAND.nameAr}.`,
  robots: { index: false, follow: false },
};

export default function IntensiveResultHistoryPage() {
  return <ResultHistoryPortal />;
}
