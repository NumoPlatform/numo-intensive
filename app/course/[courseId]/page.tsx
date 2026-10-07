import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import CoursePortal from "./CoursePortal";

export const metadata: Metadata = {
  title: "تفاصيل المقرر",
  description: `تفاصيل المقرر داخل ${BRAND.nameAr}: الاختبارات والمحاولات والنتائج.`,
  robots: { index: false, follow: false },
};

export default function CoursePage() {
  return <CoursePortal />;
}
