import type { Metadata } from "next";
import ResultHistoryPortal from "./ResultHistoryPortal";

export const metadata: Metadata = {
  title: "Result History",
  robots: { index: false, follow: false },
};

export default function IntensiveResultHistoryPage() {
  return <ResultHistoryPortal />;
}
