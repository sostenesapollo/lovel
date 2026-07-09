"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/safe-image";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";

type ImageCarouselProps = {
  images: string[];
  alt: string;
};

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const slides = images.length > 0 ? images : [PRODUCT_PLACEHOLDER];
  const [index, setIndex] = useState(0);
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);

  const current = Math.min(index, slides.length - 1);
  const src = slides[current];

  function go(delta: number) {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    if (Math.abs(e.clientX - drag.current.startX) > 12) drag.current.moved = true;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current || slides.length < 2) {
      drag.current = null;
      return;
    }
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    drag.current = null;
  }

  return (
    <div className="pdp-carousel">
      <div
        className="pdp-carousel__main"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        style={{ touchAction: "pan-y", cursor: slides.length > 1 ? "grab" : "default" }}
      >
        <SafeImage
          src={src}
          alt={alt}
          width={640}
          height={640}
          unoptimized
          priority
          draggable={false}
        />
        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="pdp-carousel__nav pdp-carousel__nav--prev"
              onClick={() => go(-1)}
              aria-label="Imagem anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="pdp-carousel__nav pdp-carousel__nav--next"
              onClick={() => go(1)}
              aria-label="Próxima imagem"
            >
              ›
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <div className="pdp-carousel__dots" role="tablist" aria-label="Imagens">
            {slides.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                className={`pdp-carousel__dot${i === current ? " pdp-carousel__dot--active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Imagem ${i + 1}`}
                aria-selected={i === current}
              />
            ))}
          </div>

          <div className="pdp-carousel__thumbs">
            {slides.map((slide, i) => (
              <button
                key={slide + i}
                type="button"
                className={`pdp-carousel__thumb${i === current ? " pdp-carousel__thumb--active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Miniatura ${i + 1}`}
              >
                <SafeImage
                  src={slide}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
