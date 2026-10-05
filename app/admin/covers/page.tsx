import type { Metadata } from "next";
import CoversPortal from "./CoversPortal";

export const metadata: Metadata = {
  title: "Course Covers",
  robots: { index: false, follow: false },
};

export default function IntensiveCoversPage() {
  return <CoversPortal />;
}
