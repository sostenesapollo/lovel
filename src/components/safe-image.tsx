"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";

function resolveSrc(src: string | null | undefined, fallback: string) {
  const value = typeof src === "string" ? src.trim() : "";
  return value || fallback;
}

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  fallback?: string;
};

/** next/image com fallback para placeholder quando a URL quebra ou está vazia. */
export function SafeImage({
  src,
  fallback = PRODUCT_PLACEHOLDER,
  alt,
  ...props
}: SafeImageProps) {
  const resolved = resolveSrc(src, fallback);
  const [current, setCurrent] = useState(resolved);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrent(resolveSrc(src, fallback));
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={current}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
