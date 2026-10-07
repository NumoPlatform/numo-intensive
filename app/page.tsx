import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import IntensivePortal from "./IntensivePortal";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.nameAr} | ${BRAND.nameEn}` },
  description: BRAND.metadataDescription,
  openGraph: {
    title: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    description: BRAND.metadataDescription,
  },
  twitter: {
    title: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    description: BRAND.metadataDescription,
  },
  robots: { index: false, follow: false },
};

export default function IntensivePage() {
  return <IntensivePortal />;
}
