import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoGuidePage } from "@/components/seo-guide-page";
import { getSeoPagesByKind, SEO_PAGE_BY_SLUG } from "@/lib/seo/catalog";
import { absoluteUrl } from "@/lib/seo/site";

export function generateStaticParams() {
  return getSeoPagesByKind("paraguai").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGE_BY_SLUG[slug];
  if (!page || page.kind !== "paraguai") return {};

  const url = absoluteUrl(`/paraguai/${page.slug}`);
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

export default async function ParaguaiSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SEO_PAGE_BY_SLUG[slug];
  if (!page || page.kind !== "paraguai") notFound();
  return <SeoGuidePage page={page} activeNav="paraguai" />;
}
