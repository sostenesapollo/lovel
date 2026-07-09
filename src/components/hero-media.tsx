"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
  brand?: string;
  name?: string;
};

const INTERVAL_MS = 4200;

export function HeroMedia({ slides }: { slides: HeroSlide[] }) {
  const items = slides.length > 0 ? slides : [{ src: "/product-placeholder.svg", alt: "LOVEL" }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  return (
    <div
      className="hero__media"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {items.map((slide, i) => (
        <div
          key={`${slide.src}-${i}`}
          className={`hero__slide${i === index ? " hero__slide--active" : ""}`}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="(max-width: 900px) 100vw, 50vw"
            className="hero__img"
            unoptimized
          />
        </div>
      ))}

      {items[index]?.name && (
        <div className="hero__caption">
          {items[index].brand && <span className="hero__caption-brand">{items[index].brand}</span>}
          <span className="hero__caption-name">{items[index].name}</span>
        </div>
      )}

      {items.length > 1 && (
        <div className="hero__dots" role="tablist" aria-label="Produtos em destaque">
          {items.map((slide, i) => (
            <button
              key={`dot-${slide.src}-${i}`}
              type="button"
              role="tab"
              className={`hero__dot${i === index ? " hero__dot--active" : ""}`}
              aria-label={slide.name ? `Ver ${slide.name}` : `Imagem ${i + 1}`}
              aria-selected={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
