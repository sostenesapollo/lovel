import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoGuidePage } from "@/components/seo-guide-page";
import { SEO_PAGE_BY_SLUG, SEO_PAGES } from "@/lib/seo/catalog";
import { absoluteUrl } from "@/lib/seo/site";

const GUIDE_KINDS = new Set(["perfume", "intent", "guide", "brand"]);

export function generateStaticParams() {
  return SEO_PAGES.filter((p) => GUIDE_KINDS.has(p.kind)).map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGE_BY_SLUG[slug];
  if (!page || !GUIDE_KINDS.has(page.kind)) return {};

  const url = absoluteUrl(`/guia/${page.slug}`);
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "article",
      locale: "pt_BR",
      siteName: "LOVEL",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export default async function GuiaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SEO_PAGE_BY_SLUG[slug];
  if (!page || !GUIDE_KINDS.has(page.kind)) notFound();
  return <SeoGuidePage page={page} />;
}
