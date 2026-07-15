"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

type ProductRailProps = {
  products: Product[];
  sectionId: string;
  label: string;
  /** Quantos cards renderizar de início; mais entram ao aproximar do fim do scroll */
  initialVisible?: number;
  batchSize?: number;
};

export function ProductRail({
  products,
  sectionId,
  label,
  initialVisible = 12,
  batchSize = 8,
}: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(initialVisible, products.length),
  );
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    setVisibleCount(Math.min(initialVisible, products.length));
  }, [products, initialVisible, sectionId]);

  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const revealMore = useCallback(() => {
    setVisibleCount((n) => Math.min(products.length, n + batchSize));
  }, [products.length, batchSize]);

  const updateNav = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const atEnd = el.scrollLeft >= max - 24;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8 || hasMore);

    if (atEnd && hasMore) {
      revealMore();
    }
  }, [hasMore, revealMore]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateNav();
    el.addEventListener("scroll", updateNav, { passive: true });
    const ro = new ResizeObserver(updateNav);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateNav);
      ro.disconnect();
    };
  }, [visible.length, updateNav]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    if (dir === 1 && hasMore) {
      const max = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= max - 40) revealMore();
    }
    const card = el.querySelector<HTMLElement>(".recs-rail__item");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    const pages = Math.max(1, Math.floor(el.clientWidth / step));
    el.scrollBy({ left: dir * step * pages, behavior: "smooth" });
  }

  if (!products.length) return null;

  const showNav = products.length > 2;

  return (
    <div className="recs-rail">
      {showNav ? (
        <div className="recs-rail__nav">
          <span className="recs-rail__progress">
            {Math.min(visibleCount, products.length)} de {products.length}
          </span>
          <button
            type="button"
            className="recs-rail__btn"
            aria-label={`Anterior — ${label}`}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="recs-rail__btn"
            aria-label={`Próximo — ${label}`}
            disabled={!canNext && !hasMore}
            onClick={() => scrollByDir(1)}
          >
            ›
          </button>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className="recs-rail__track"
        role="list"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollByDir(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollByDir(-1);
          }
        }}
      >
        {visible.map((p) => (
          <div key={`${sectionId}-${p.id}`} className="recs-rail__item" role="listitem">
            <ProductCard product={p} />
          </div>
        ))}
        {hasMore ? (
          <div className="recs-rail__more" role="listitem">
            <button type="button" className="recs-rail__more-btn" onClick={revealMore}>
              Ver mais
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </div>

      {showNav && (canNext || hasMore) ? (
        <p className="recs-rail__hint">Deslize ou use as setas para ver mais</p>
      ) : null}
    </div>
  );
}
