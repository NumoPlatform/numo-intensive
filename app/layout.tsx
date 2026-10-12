import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";
import NumoMotionOverride from "./components/NumoMotionOverride";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1F2B5E",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://numo-intensive-two.vercel.app"),
  title: {
    default: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    template: `%s | ${BRAND.nameAr}`,
  },
  applicationName: BRAND.nameAr,
  description: BRAND.metadataDescription,
  openGraph: {
    title: "محاكي نُمو | NUMO Academic Simulator",
    description: BRAND.metadataDescription,
    siteName: BRAND.nameAr,
    url: "https://numo-intensive-two.vercel.app/",
    type: "website",
    locale: "ar_SA",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "محاكي نُمو — محاكاة الاختبارات والتدريب الأكاديمي" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "محاكي نُمو | NUMO Academic Simulator",
    description: BRAND.metadataDescription,
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-xl bg-[#1F2B5E] px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:right-4 focus:top-4"
        >
          تجاوز إلى المحتوى الرئيسي
        </a>
        <NumoMotionOverride />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
