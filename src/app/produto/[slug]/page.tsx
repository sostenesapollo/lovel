"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageCarousel } from "@/components/image-carousel";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import type { Product } from "@/lib/types";
import { formatPrice, getVariant, pixPrice } from "@/lib/utils";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((p) => {
        setProduct(p);
        setSelected(p.defaultVariant ?? 0);
      });
  }, [params.slug]);

  if (!product) {
    return (
      <>
        <SiteHeader />
        <div className="container" style={{ padding: "4rem 0" }}>Carregando…</div>
      </>
    );
  }

  const variant = getVariant(product, selected);
  const images = product.images?.length ? product.images : [product.image];

  return (
    <>
      <SiteHeader />
      <main className="page page--pdp">
        <div className="container pdp">
          <div className="pdp__gallery">
            <ImageCarousel images={images} alt={product.name} />
          </div>
          <div className="pdp__info">
            <span className="pdp__brand">{product.brand}</span>
            <h1 className="pdp__title">{product.name}</h1>
            <span className="pdp__category">{product.category}</span>
            {product.variants.length > 1 && (
              <div className="variant-selector">
                {product.variants.map((v, i) => (
                  <button
                    key={v.sku}
                    type="button"
                    className={`variant-btn${i === selected ? " variant-btn--active" : ""}`}
                    onClick={() => setSelected(i)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            <div className="pdp__price-row">
              <span className="pdp__price">{formatPrice(variant.price)}</span>
              {variant.oldPrice && <span className="pdp__price-old">{formatPrice(variant.oldPrice)}</span>}
            </div>
            <p className="pdp__pix">ou {formatPrice(pixPrice(variant.price))} no PIX (-5%)</p>
            <p className="pdp__description">{product.description}</p>
            {product.notes && (
              <div className="pdp__notes">
                {product.notes.top && <p><strong>Topo:</strong> {product.notes.top}</p>}
                {product.notes.heart && <p><strong>Coração:</strong> {product.notes.heart}</p>}
                {product.notes.base && <p><strong>Fundo:</strong> {product.notes.base}</p>}
              </div>
            )}
            <button type="button" className="btn btn--gold btn--lg" disabled={product.soldOut} onClick={() => add(product, selected)}>
              {product.soldOut ? "Indisponível" : "Adicionar ao carrinho"}
            </button>
            <Link href="/carrinho" className="btn btn--outline btn--lg">Ver carrinho</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
