import type { MetadataRoute } from "next";

const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "https://oar-ore.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

