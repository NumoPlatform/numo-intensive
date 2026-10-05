import type { Metadata } from "next";
import ExamRunner from "./ExamRunner";

export const metadata: Metadata = {
  title: "Exam",
  robots: { index: false, follow: false },
};

export default function IntensiveExamPage() {
  return <ExamRunner />;
}
