import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import AdminPortal from "./AdminPortal";

export const metadata: Metadata = {
  title: BRAND.adminTitle,
  description: `إدارة ${BRAND.nameAr}: الطلاب والمقررات والاختبارات والنتائج.`,
  robots: { index: false, follow: false },
};

export default function IntensiveAdminPage() {
  return <AdminPortal />;
}
