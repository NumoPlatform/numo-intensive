import type { Metadata } from "next";
import CoursePortal from "./CoursePortal";

export const metadata: Metadata = {
  title: "تفاصيل المقرر",
  description: "تفاصيل مقرر NUMO INTENSIVE والأقسام والمحاولات والنتائج.",
  robots: { index: false, follow: false },
};

export default function CoursePage() {
  return <CoursePortal />;
}
