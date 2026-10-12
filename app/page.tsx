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
    images: [{ url: "https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/e4e7e770-c491-44ef-82fe-ad0752f8cc5b.png", width: 1536, height: 807, alt: "محاكي نُمو — منصة التدريب الأكاديمي" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "محاكي نُمو | NUMO Academic Simulator",
    description: BRAND.metadataDescription,
    images: ["https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/e4e7e770-c491-44ef-82fe-ad0752f8cc5b.png"],
  },
  robots: { index: false, follow: false },
};

export default function IntensivePage() {
  return <IntensivePortal />;
}
