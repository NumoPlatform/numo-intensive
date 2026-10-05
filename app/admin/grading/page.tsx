import type { Metadata } from "next";
import GradingPortal from "./GradingPortal";

export const metadata: Metadata = {
  title: "Grading & Results",
  robots: { index: false, follow: false },
};

export default function IntensiveGradingPage() {
  return <GradingPortal />;
}
