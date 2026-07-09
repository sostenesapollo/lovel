"use client";

import Image from "next/image";
import { useState } from "react";

type ImageCarouselProps = {
  images: string[];
  alt: string;
};

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const slides = images.length > 0 ? images : [];
  const [index, setIndex] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="pdp-carousel">
        <div className="pdp-carousel__main" />
      </div>
    );
  }

  const current = Math.min(index, slides.length - 1);

  function go(delta: number) {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }

  return (
    <div className="pdp-carousel">
      <div className="pdp-carousel__main">
        <Image
          src={slides[current]}
          alt={alt}
          width={800}
          height={800}
          unoptimized
          priority
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
            {slides.map((src, i) => (
              <button
                key={src + i}
                type="button"
                className={`pdp-carousel__thumb${i === current ? " pdp-carousel__thumb--active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Miniatura ${i + 1}`}
              >
                <Image src={src} alt="" width={64} height={64} unoptimized />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
