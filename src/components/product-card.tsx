"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatPrice, pixPrice, productPath, getVariant } from "@/lib/utils";
import { useCart } from "@/context/cart-context";

function Badges({ badges }: { badges: Product["badges"] }) {
  return (
    <>
      {badges.map((b) => (
        <span key={b.text} className={`badge badge--${b.type}`}>{b.text}</span>
      ))}
    </>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [selected, setSelected] = useState(product.defaultVariant ?? 0);
  const [imgSrc, setImgSrc] = useState(product.image || "/product-placeholder.svg");
  const variant = getVariant(product, selected);

  return (
    <article className={`product-card${product.soldOut ? " product-card--sold-out" : ""}`}>
      <Link href={productPath(product)} className="product-card__image-wrap">
        <Image
          src={imgSrc}
          alt={product.name}
          width={400}
          height={400}
          className="product-card__image"
          unoptimized
          onError={() => setImgSrc("/product-placeholder.svg")}
        />
        <div className="product-card__badges"><Badges badges={product.badges} /></div>
      </Link>
      <div className="product-card__body">
        <span className="product-card__brand">{product.brand}</span>
        <h3 className="product-card__name">
          <Link href={productPath(product)}>{product.name}</Link>
        </h3>
        <span className="product-card__category">{product.category}</span>
        {product.variants.length > 1 && (
          <div className="variant-selector" role="group" aria-label="Selecionar tamanho">
            {product.variants.map((v, i) => (
              <button
                key={v.sku}
                type="button"
                className={`variant-btn${i === selected ? " variant-btn--active" : ""}`}
                disabled={v.disabled || product.soldOut}
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(variant.price)}</span>
          {variant.oldPrice && (
            <span className="product-card__price-old">{formatPrice(variant.oldPrice)}</span>
          )}
        </div>
        {!product.soldOut && (
          <span className="product-card__pix">ou {formatPrice(pixPrice(variant.price))} no PIX (−5%)</span>
        )}
        <button
          type="button"
          className="btn btn--dark"
          disabled={product.soldOut}
          onClick={() => add(product, selected)}
        >
          {product.soldOut ? "Indisponível" : "Comprar"}
        </button>
      </div>
    </article>
  );
}
