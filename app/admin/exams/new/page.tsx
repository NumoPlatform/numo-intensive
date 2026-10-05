import type { Metadata } from "next";
import ExamWizard from "./ExamWizard";

export const metadata: Metadata = {
  title: "إنشاء اختبار",
  description: "إنشاء اختبار جديد في NUMO INTENSIVE.",
  robots: { index: false, follow: false },
};

export default function NewExamPage() {
  return <ExamWizard />;
}
