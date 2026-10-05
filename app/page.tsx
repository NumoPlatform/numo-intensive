import type { Metadata } from "next";
import IntensivePortal from "./IntensivePortal";

export const metadata: Metadata = {
  title: { absolute: "NUMO INTENSIVE | الدورات المكثفة" },
  description: "البوابة الخاصة لمنصة نمو للدورات المكثفة والاختبارات.",
  robots: { index: false, follow: false },
};

export default function IntensivePage() {
  return <IntensivePortal />;
}
