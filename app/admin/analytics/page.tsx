import type { Metadata } from "next";
import AnalyticsPortal from "./AnalyticsPortal";

export const metadata: Metadata = {
  title: "Results & Analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsPortal />;
}
