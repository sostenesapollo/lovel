import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { getSiteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/guia`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/paraguai`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/depoimentos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/categoria?tipo=perfumes`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/categoria?tipo=perfumes&sub=arabes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/categoria?tipo=perfumes&sub=grifes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/categoria?tipo=perfumes&sub=nicho`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/categoria?tipo=cabelos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/categoria?tipo=skincare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const seoRoutes: MetadataRoute.Sitemap = SEO_PAGES.map((page) => {
    const path =
      page.kind === "paraguai"
        ? `/paraguai/${page.slug}`
        : `/guia/${page.slug}`;
    const priority =
      page.kind === "perfume"
        ? 0.8
        : page.kind === "paraguai"
          ? 0.75
          : page.kind === "brand"
            ? 0.7
            : 0.65;
    return {
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
    };
  });

  return [...staticRoutes, ...seoRoutes];
}
