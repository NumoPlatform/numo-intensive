import type { Metadata } from "next";
import QuestionBankPortal from "./QuestionBankPortal";

export const metadata: Metadata = {
  title: "Question Bank",
};

export default function QuestionBankPage() {
  return <QuestionBankPortal />;
}
