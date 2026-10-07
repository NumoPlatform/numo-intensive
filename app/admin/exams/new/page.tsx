import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import ExamWizard from "./ExamWizard";

export const metadata: Metadata = {
  title: "إنشاء اختبار",
  description: `إنشاء اختبار جديد في ${BRAND.nameAr}.`,
  robots: { index: false, follow: false },
};

export default function NewExamPage() {
  return <ExamWizard />;
}
