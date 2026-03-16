import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/advisor", "/portal", "/superadmin", "/api"],
      },
    ],
    sitemap: "https://www.finatiq.cz/sitemap.xml",
  };
}
