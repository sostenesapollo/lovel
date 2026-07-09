import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { getSiteUrl } from "@/lib/seo/site";
import { productPath } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      // & must be &amp; in sitemap XML (Next does not escape query strings)
      url: `${base}/categoria?tipo=perfumes&amp;sub=arabes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/categoria?tipo=perfumes&amp;sub=grifes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/categoria?tipo=perfumes&amp;sub=nicho`,
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

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}${productPath(p)}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...seoRoutes, ...productRoutes];
}
