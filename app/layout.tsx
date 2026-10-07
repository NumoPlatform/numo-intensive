import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1F2B5E",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_ORIGIN || "https://intensive.numo.academy"),
  title: {
    default: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    template: `%s | ${BRAND.nameAr}`,
  },
  applicationName: BRAND.nameAr,
  description: BRAND.metadataDescription,
  openGraph: {
    title: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    description: BRAND.metadataDescription,
    siteName: BRAND.nameAr,
    type: "website",
    locale: "ar_SA",
  },
  twitter: {
    card: "summary",
    title: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    description: BRAND.metadataDescription,
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
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
