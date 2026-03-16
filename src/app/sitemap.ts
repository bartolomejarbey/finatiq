import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.finatiq.cz";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/cenik`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/funkce`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/kontakt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/proc-my`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/fakturace`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/podminky`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/gdpr`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];
}
