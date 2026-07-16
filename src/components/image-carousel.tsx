"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { SafeImage } from "@/components/safe-image";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";

type ImageCarouselProps = {
  images: string[];
  alt: string;
};

const ZOOM_SCALE = 2.4;

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const slides = images.length > 0 ? images : [PRODUCT_PLACEHOLDER];
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);

  const current = Math.min(index, slides.length - 1);
  const src = slides[current];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + slides.length) % slides.length);
      setZoomed(false);
    },
    [slides.length],
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && slides.length > 1) go(-1);
      if (e.key === "ArrowRight" && slides.length > 1) go(1);
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, closeLightbox, go, slides.length]);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    if (Math.abs(e.clientX - drag.current.startX) > 12) drag.current.moved = true;
  }

  function onPointerUp(e: React.PointerEvent) {
    const state = drag.current;
    drag.current = null;
    if (!state) return;

    if (slides.length > 1 && Math.abs(e.clientX - state.startX) > 40) {
      go(e.clientX - state.startX < 0 ? 1 : -1);
      return;
    }

    if (!state.moved) openZoom(e);
  }

  function openZoom(e: React.MouseEvent | React.PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
    setZoomed(false);
    setLightboxOpen(true);
  }

  function toggleLightboxZoom(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
    setZoomed(true);
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
        role="button"
        tabIndex={0}
        aria-label={`Ampliar imagem de ${alt}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightboxOpen(true);
            setZoomed(false);
          }
        }}
      >
        <SafeImage
          src={src}
          alt={alt}
          width={800}
          height={1000}
          unoptimized
          priority
          draggable={false}
          className="pdp-carousel__img"
        />
        <span className="pdp-carousel__zoom-hint" aria-hidden="true">
          Clique para ampliar
        </span>
        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="pdp-carousel__nav pdp-carousel__nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Imagem anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="pdp-carousel__nav pdp-carousel__nav--next"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
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
                <SafeImage src={slide} alt="" width={64} height={64} unoptimized className="pdp-carousel__thumb-img" />
              </button>
            ))}
          </div>
        </>
      )}

      {lightboxOpen && (
        <div
          className="pdp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Zoom: ${alt}`}
          onClick={closeLightbox}
        >
          <button type="button" className="pdp-lightbox__close" onClick={closeLightbox} aria-label="Fechar zoom">
            ×
          </button>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="pdp-lightbox__nav pdp-lightbox__nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Imagem anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className="pdp-lightbox__nav pdp-lightbox__nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Próxima imagem"
              >
                ›
              </button>
            </>
          )}

          <div
            className={`pdp-lightbox__stage${zoomed ? " pdp-lightbox__stage--zoomed" : ""}`}
            onClick={toggleLightboxZoom}
            style={
              {
                "--zoom-x": `${zoomOrigin.x}%`,
                "--zoom-y": `${zoomOrigin.y}%`,
                "--zoom-scale": ZOOM_SCALE,
              } as CSSProperties
            }
          >
            <SafeImage
              src={src}
              alt={alt}
              width={1200}
              height={1500}
              unoptimized
              draggable={false}
              className="pdp-lightbox__img"
            />
          </div>

          <p className="pdp-lightbox__hint">
            {zoomed ? "Clique para reduzir · Esc para fechar" : "Clique para dar zoom · Esc para fechar"}
          </p>
        </div>
      )}
    </div>
  );
}
