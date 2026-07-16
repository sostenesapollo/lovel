"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/safe-image";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";
import type { HeroSlide } from "@/lib/types";
import { categoryPath, formatPrice, productPath } from "@/lib/utils";

const INTERVAL_MS = 4200;
const DECANT_HREF = "/categoria?tipo=perfumes&sort=price_asc";
const SWIPE_THRESHOLD = 40;

type HeroSplitProps = {
  slides: HeroSlide[];
  /** Pedidos pagos — usado na linha de prova social. */
  paidOrderCount?: number;
};

export function HeroSplit({ slides, paidOrderCount = 0 }: HeroSplitProps) {
  const items = slides.length > 0 ? slides : null;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ startX: number; startY: number; axis: "x" | "y" | null } | null>(null);
  const suppressClick = useRef(false);

  const go = useCallback(
    (delta: number) => {
      if (!items || items.length < 2) return;
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items],
  );

  useEffect(() => {
    if (!items || items.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items, paused]);

  useEffect(() => {
    if (!items) return;
    if (index >= items.length) setIndex(0);
  }, [items, index]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a.hero__dot")) return;
    drag.current = { startX: e.clientX, startY: e.clientY, axis: null };
    suppressClick.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const state = drag.current;
    if (!state) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // Vertical → leave page scroll alone; horizontal → take over for slides
      state.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      if (state.axis === "x") {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const state = drag.current;
    drag.current = null;
    if (!state || state.axis !== "x") return;

    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1);
      suppressClick.current = true;
    }
  }

  function onSlideClick(e: React.MouseEvent) {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  }

  const active = items?.[index];
  const productHref = active?.slug ? productPath({ slug: active.slug }) : categoryPath("perfumes");
  const socialLine =
    paidOrderCount >= 20
      ? `+${Math.floor(paidOrderCount / 10) * 10} pedidos · originais · PIX −5% · envio Brasil`
      : "Originais · PIX −5% · envio para todo o Brasil";

  return (
    <section className="hero hero--split">
      <div className="hero__copy">
        <div className="hero__copy-inner">
          <p className="hero__proof">{socialLine}</p>
          <h1 className="hero__title">
            A essência da elegância, <em>em cada gota.</em>
          </h1>
          <p className="hero__subtitle">
            Perfumes árabes, grifes e nicho. Experimente em <em>decant a partir de 4ml</em> ou
            leve o <em>frasco inteiro</em> — luxo no tamanho certo pra você.
          </p>

          {active?.fromPrice != null && (
            <p className="hero__price-anchor" key={active.slug}>
              <span className="hero__price-anchor-label">
                {active.brand} {active.name}
              </span>
              <span className="hero__price-anchor-value">
                a partir de <strong>{formatPrice(active.fromPrice)}</strong>
                {active.fromLabel ? ` · ${active.fromLabel}` : ""}
              </span>
            </p>
          )}

          <div className="hero__actions">
            <Link href={productHref} className="btn btn--dark">
              {active?.name ? "Ver este perfume →" : "Explorar perfumes →"}
            </Link>
            <Link href={DECANT_HREF} className="btn btn--outline">
              Experimentar em decant
            </Link>
          </div>
          <Link href={categoryPath("perfumes")} className="hero__secondary-link">
            Ver toda a coleção
          </Link>
        </div>
      </div>

      <div
        className="hero__media"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {(items ?? [{ src: PRODUCT_PLACEHOLDER, alt: "LOVEL", brand: "", name: "", slug: "", fromPrice: null, fromLabel: null }]).map(
          (slide, i) => {
            const isActive = i === index;
            const content = (
              <SafeImage
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 900px) 100vw, 50vw"
                className="hero__img"
                unoptimized
                draggable={false}
              />
            );
            const className = `hero__slide${isActive ? " hero__slide--active" : ""}`;
            const key = `${slide.slug || slide.src}-${i}`;

            if (slide.slug) {
              return (
                <Link
                  key={key}
                  href={productPath({ slug: slide.slug })}
                  className={className}
                  aria-hidden={!isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`Ver ${slide.brand} ${slide.name}`}
                  onClick={onSlideClick}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={key} className={className} aria-hidden={!isActive}>
                {content}
              </div>
            );
          },
        )}

        {active?.name && (
          <div className="hero__caption" key={`cap-${active.slug}`}>
            {active.brand && <span className="hero__caption-brand">{active.brand}</span>}
            <span className="hero__caption-name">{active.name}</span>
            {active.fromPrice != null && (
              <span className="hero__caption-price">
                a partir de {formatPrice(active.fromPrice)}
                {active.fromLabel ? ` · ${active.fromLabel}` : ""}
              </span>
            )}
            {active.slug && <span className="hero__caption-cta">Ver produto →</span>}
          </div>
        )}

        {items && items.length > 1 && (
          <div className="hero__dots" role="tablist" aria-label="Produtos em destaque">
            {items.map((slide, i) => (
              <button
                key={`dot-${slide.slug}-${i}`}
                type="button"
                role="tab"
                className={`hero__dot${i === index ? " hero__dot--active" : ""}`}
                aria-label={`Ver ${slide.name}`}
                aria-selected={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
