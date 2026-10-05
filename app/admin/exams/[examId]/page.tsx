import type { Metadata } from "next";
import ExamManager from "./ExamManager";

export const metadata: Metadata = {
  title: "Manage exam",
  robots: { index: false, follow: false },
};

export default function IntensiveExamManagerPage() {
  return <ExamManager />;
}
