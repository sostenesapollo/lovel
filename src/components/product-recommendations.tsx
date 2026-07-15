"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductRail } from "@/components/product-rail";
import { readTasteProfile, recordProductView, type TasteProfile } from "@/lib/browsing-taste";
import { buildRecommendationSections, type RecommendSection } from "@/lib/recommendations";
import type { Product } from "@/lib/types";

type ProductRecommendationsProps = {
  /** Produto da PDP — entra no gosto e como semente de similaridade */
  seed?: Product | null;
  /** Tipo da página de categoria (perfumes / cabelos / skincare) */
  pageType?: string;
  /** Produtos já listados na página — não repetir */
  excludeIds?: string[];
  className?: string;
};

const RAIL_LIMIT = 16;

export function ProductRecommendations({
  seed = null,
  pageType,
  excludeIds = [],
  className = "",
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
      maxSections: 3,
    });
  }, [catalog, seed, taste, excludeKey, pageType]);

  if (!sections.length) return null;

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
            </header>
            <ProductRail
              products={section.products}
              sectionId={section.id}
              label={section.title}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
