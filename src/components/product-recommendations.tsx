"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductRail } from "@/components/product-rail";
import { readTasteProfile, recordProductView, type TasteProfile } from "@/lib/browsing-taste";
import { CATEGORIES } from "@/lib/constants";
import { buildRecommendationSections, type RecommendSection } from "@/lib/recommendations";
import type { Product } from "@/lib/types";
import { categoryPath } from "@/lib/utils";

type ProductRecommendationsProps = {
  /** Produto da PDP — entra no gosto e como semente de similaridade */
  seed?: Product | null;
  /** Tipo da página de categoria (perfumes / cabelos / skincare) */
  pageType?: string;
  /** Produtos já listados na página — não repetir */
  excludeIds?: string[];
  className?: string;
  /** Mostra atalhos para outras categorias no final (padrão em PDP) */
  showCategoryLinks?: boolean;
};

const RAIL_LIMIT = 40;

const CATEGORY_CARDS = (Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((slug) => ({
  slug,
  title: CATEGORIES[slug].title,
  subtitle: CATEGORIES[slug].subtitle,
}));

export function ProductRecommendations({
  seed = null,
  pageType,
  excludeIds = [],
  className = "",
  showCategoryLinks = Boolean(seed),
}: ProductRecommendationsProps) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const excludeKey = excludeIds.join(",");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[] | { items: Product[] }) => {
        if (cancelled) return;
        setCatalog(Array.isArray(data) ? data : data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (seed) {
      setTaste(recordProductView(seed));
      return;
    }
    setTaste(readTasteProfile());
  }, [seed]);

  const sections: RecommendSection[] = useMemo(() => {
    if (!catalog.length) return [];
    const excluded = excludeKey ? excludeKey.split(",").filter(Boolean) : [];
    return buildRecommendationSections({
      catalog,
      seed,
      contextType: pageType,
      taste,
      excludeIds: seed ? [seed.id, ...excluded] : excluded,
      alreadyShownIds: excluded,
      limitPerSection: RAIL_LIMIT,
      maxSections: 6,
    });
  }, [catalog, seed, taste, excludeKey, pageType]);

  const otherCategories = useMemo(() => {
    const current = seed?.type || pageType;
    return CATEGORY_CARDS.filter((c) => c.slug !== current);
  }, [seed?.type, pageType]);

  if (!sections.length && !showCategoryLinks) return null;

  return (
    <div className={`recs${className ? ` ${className}` : ""}`}>
      {sections.map((section) => (
        <section key={section.id} className="recs__section section" aria-labelledby={`recs-${section.id}`}>
          <div className="container">
            <header className="section__head recs__head">
              <div>
                <p className="recs__eyebrow">{section.eyebrow}</p>
                <h2 id={`recs-${section.id}`} className="section__title">
                  {section.title}
                </h2>
                {section.products.length > 4 ? (
                  <p className="recs__count">{section.products.length} sugestões</p>
                ) : null}
              </div>
              {section.href ? (
                <Link href={section.href} className="recs__link">
                  Ver todos →
                </Link>
              ) : null}
            </header>
            <ProductRail
              products={section.products}
              sectionId={section.id}
              label={section.title}
              initialVisible={12}
              batchSize={10}
            />
          </div>
        </section>
      ))}

      {showCategoryLinks && otherCategories.length > 0 ? (
        <section className="recs__section section recs__categories" aria-labelledby="recs-categories">
          <div className="container">
            <header className="section__head recs__head">
              <div>
                <p className="recs__eyebrow">Explore a boutique</p>
                <h2 id="recs-categories" className="section__title">
                  Outras categorias
                </h2>
              </div>
            </header>
            <div className="recs-cats">
              {otherCategories.map((cat) => (
                <Link key={cat.slug} href={categoryPath(cat.slug)} className="recs-cats__card">
                  <span className="recs-cats__title">{cat.title}</span>
                  <span className="recs-cats__sub">{cat.subtitle}</span>
                  <span className="recs-cats__cta">Ver coleção →</span>
                </Link>
              ))}
              <Link href={categoryPath("perfumes")} className="recs-cats__card recs-cats__card--all">
                <span className="recs-cats__title">Toda a loja</span>
                <span className="recs-cats__sub">Perfumes, cabelos e skincare</span>
                <span className="recs-cats__cta">Começar →</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
