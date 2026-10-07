import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.nameAr} | ${BRAND.nameEn}`,
    short_name: BRAND.nameAr,
    description: BRAND.metadataDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#F6F2ED",
    theme_color: "#1F2B5E",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
