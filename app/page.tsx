import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import IntensivePortal from "./IntensivePortal";

export const metadata: Metadata = {
  title: { absolute: "محاكي نُمو | NUMO Academic Simulator" },
  description: BRAND.metadataDescription,
  openGraph: {
    title: "محاكي نُمو | NUMO Academic Simulator",
    description: BRAND.metadataDescription,
    url: "https://numo-intensive-two.vercel.app/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "محاكي نُمو — منصة التدريب الأكاديمي" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "محاكي نُمو | NUMO Academic Simulator",
    description: BRAND.metadataDescription,
    images: ["/opengraph-image"],
  },
  robots: { index: false, follow: false },
};

export default function IntensivePage() {
  return <IntensivePortal />;
}
