import type { MetadataRoute } from "next";

// Search engines still cannot index the platform. Only social sharing bots
// may read the public login page and its share thumbnail; private pages stay closed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ["facebookexternalhit", "Facebot", "WhatsApp", "TelegramBot", "Twitterbot"],
        allow: ["/", "/opengraph-image"],
        disallow: ["/admin", "/api", "/course", "/exam", "/results", "/demo"],
      },
      { userAgent: "*", disallow: "/" },
    ],
  };
}
