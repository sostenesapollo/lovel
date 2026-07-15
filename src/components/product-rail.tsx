"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

type ProductRailProps = {
  products: Product[];
  sectionId: string;
  label: string;
};

export function ProductRail({ products, sectionId, label }: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateNav = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
  }, []);

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
  }, [products, updateNav]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".recs-rail__item");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * Math.max(1, Math.floor(el.clientWidth / step)), behavior: "smooth" });
  }

  if (!products.length) return null;

  const showNav = products.length > 2;

  return (
    <div className="recs-rail">
      {showNav ? (
        <div className="recs-rail__nav" aria-hidden={!canPrev && !canNext}>
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
            disabled={!canNext}
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
        {products.map((p) => (
          <div key={`${sectionId}-${p.id}`} className="recs-rail__item" role="listitem">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {showNav && canNext ? (
        <p className="recs-rail__hint">Deslize para ver mais</p>
      ) : null}
    </div>
  );
}
