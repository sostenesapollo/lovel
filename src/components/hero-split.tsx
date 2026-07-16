"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/safe-image";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";
import type { HeroSlide } from "@/lib/types";
import { categoryPath, formatPrice, productPath } from "@/lib/utils";

const INTERVAL_MS = 4200;
const DECANT_HREF = "/categoria?tipo=perfumes&sort=price_asc";
const toneCache = new Map<string, "on-dark" | "on-light">();

type HeroSplitProps = {
  slides: HeroSlide[];
  /** Pedidos pagos — usado na linha de prova social. */
  paidOrderCount?: number;
};

const FALLBACK_SLIDE: HeroSlide = {
  src: PRODUCT_PLACEHOLDER,
  alt: "LOVEL",
  brand: "",
  name: "",
  slug: "",
  fromPrice: null,
  fromLabel: null,
};

/** Amostra a região da legenda e decide se o fundo é claro ou escuro. */
function detectCaptionTone(src: string): Promise<"on-dark" | "on-light"> {
  const cached = toneCache.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new window.Image();
    const finish = (tone: "on-dark" | "on-light") => {
      toneCache.set(src, tone);
      resolve(tone);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = 64;
        const h = 48;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish("on-dark");
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const sx = 0;
        const sy = Math.floor(h * 0.55);
        const sw = Math.floor(w * 0.55);
        const sh = h - sy;
        const { data } = ctx.getImageData(sx, sy, sw, sh);
        let sum = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          n += 1;
        }
        finish(sum / n > 145 ? "on-light" : "on-dark");
      } catch {
        finish("on-dark");
      }
    };
    img.onerror = () => finish("on-dark");

    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export function HeroSplit({ slides, paidOrderCount = 0 }: HeroSplitProps) {
  const items = slides.length > 0 ? slides : [FALLBACK_SLIDE];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [captionTone, setCaptionTone] = useState<"on-dark" | "on-light">("on-dark");
  const trackRef = useRef<HTMLDivElement>(null);
  const ignoreScroll = useRef(false);

  const scrollToIndex = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const el = trackRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    ignoreScroll.current = true;
    el.scrollTo({ left: i * width, behavior });
    setIndex(i);
    window.setTimeout(() => {
      ignoreScroll.current = false;
    }, behavior === "smooth" ? 450 : 50);
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = window.setInterval(() => {
      const next = (index + 1) % items.length;
      scrollToIndex(next);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length, paused, index, scrollToIndex]);

  useEffect(() => {
    if (index >= items.length) scrollToIndex(0, "instant");
  }, [items.length, index, scrollToIndex]);

  useEffect(() => {
    const src = items[index]?.src;
    if (!src) {
      setCaptionTone("on-dark");
      return;
    }
    let cancelled = false;
    detectCaptionTone(src).then((tone) => {
      if (!cancelled) setCaptionTone(tone);
    });
    return () => {
      cancelled = true;
    };
  }, [items, index]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    function onScroll() {
      if (ignoreScroll.current) return;
      const width = el!.clientWidth;
      if (width <= 0) return;
      const next = Math.round(el!.scrollLeft / width);
      setIndex((prev) => (next !== prev ? Math.min(next, items.length - 1) : prev));
    }

    function onWheel(e: WheelEvent) {
      if (items.length < 2) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!horizontal) return;
      e.preventDefault();
      el!.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
      setPaused(true);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, [items.length]);

  const active = items[index] ?? items[0];
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
      >
        <div ref={trackRef} className="hero__track">
          {items.map((slide, i) => {
            const isActive = i === index;
            const className = `hero__slide${isActive ? " hero__slide--active" : ""}`;
            const key = `${slide.slug || slide.src}-${i}`;
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

            if (slide.slug) {
              return (
                <Link
                  key={key}
                  href={productPath({ slug: slide.slug })}
                  className={className}
                  aria-hidden={!isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`Ver ${slide.brand} ${slide.name}`}
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
          })}
        </div>

        {active?.name && (
          <div
            className={`hero__caption${captionTone === "on-light" ? " hero__caption--on-light" : ""}`}
            key={`cap-${active.slug}`}
          >
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

        {items.length > 1 && (
          <>
            <button
              type="button"
              className="hero__nav hero__nav--prev"
              aria-label="Perfume anterior"
              onClick={() => {
                setPaused(true);
                scrollToIndex((index - 1 + items.length) % items.length);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="hero__nav hero__nav--next"
              aria-label="Próximo perfume"
              onClick={() => {
                setPaused(true);
                scrollToIndex((index + 1) % items.length);
              }}
            >
              ›
            </button>
            <div className="hero__dots" role="tablist" aria-label="Produtos em destaque">
              {items.map((slide, i) => (
                <button
                  key={`dot-${slide.slug}-${i}`}
                  type="button"
                  role="tab"
                  className={`hero__dot${i === index ? " hero__dot--active" : ""}`}
                  aria-label={`Ver ${slide.name}`}
                  aria-selected={i === index}
                  onClick={() => {
                    setPaused(true);
                    scrollToIndex(i);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
