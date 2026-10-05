import type { Metadata } from "next";
import AdminPortal from "./AdminPortal";

export const metadata: Metadata = {
  title: "Admin Control Center",
  description: "Manage NUMO intensive course students, exams, and results.",
  robots: { index: false, follow: false },
};

export default function IntensiveAdminPage() {
  return <AdminPortal />;
}
