"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageCarousel } from "@/components/image-carousel";
import { ShippingEstimator } from "@/components/shipping-estimator";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import { trackViewItem } from "@/lib/analytics";
import { flyToCart } from "@/lib/fly-to-cart";
import type { Product } from "@/lib/types";
import { formatPrice, formatProductDescription, getVariant, pixPrice } from "@/lib/utils";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const { add, setShippingDest, shippingDest } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((p) => {
        if (p?.error) {
          setProduct(null);
          return;
        }
        setProduct(p);
        setSelected(p.defaultVariant ?? 0);
      })
      .catch(() => setProduct(null));
  }, [params.slug]);

  useEffect(() => {
    if (!product) return;
    const v = getVariant(product, selected);
    if (!v) return;
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      item_variant: v.label,
      item_category: product.category,
      price: v.price,
      quantity: 1,
    });
  }, [product, selected]);

  if (!product) {
    return (
      <>
        <SiteHeader />
        <div className="container" style={{ padding: "4rem 0" }}>
          Carregando…
        </div>
      </>
    );
  }

  const variant = getVariant(product, selected);
  const images = product.images?.length ? product.images : product.image ? [product.image] : [];

  return (
    <>
      <SiteHeader />
      <main className="page page--pdp">
        <div className="container pdp pdp__grid">
          <div className="pdp__gallery">
            <ImageCarousel images={images} alt={product.name} />
          </div>
          <div className="pdp__info">
            <span className="pdp__brand">{product.brand}</span>
            <h1 className="pdp__title">{product.name}</h1>
            {product.category ? (
              <span className="pdp__category">{product.category}</span>
            ) : null}

            {product.variants.length > 1 && (
              <div className="pdp__variants">
                <p className="pdp__variants-label">Escolha o tamanho</p>
                <div className="variant-selector variant-selector--pdp" role="group" aria-label="Tamanho">
                  {product.variants.map((v, i) => (
                    <button
                      key={v.sku}
                      type="button"
                      className={`variant-btn${i === selected ? " variant-btn--active" : ""}`}
                      disabled={v.disabled}
                      onClick={() => setSelected(i)}
                    >
                      <span className="variant-btn__label">{v.label}</span>
                      <span className="variant-btn__price">{formatPrice(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pdp__price-block">
              <div className="pdp__price-row">
                <span className="pdp__price">{formatPrice(variant.price)}</span>
                {variant.oldPrice && <span className="pdp__price-old">{formatPrice(variant.oldPrice)}</span>}
              </div>
              <p className="pdp__pix">ou {formatPrice(pixPrice(variant.price))} no PIX (−5%)</p>
            </div>

            {product.description ? (
              <div
                className="pdp__description"
                dangerouslySetInnerHTML={{
                  __html: formatProductDescription(product.description),
                }}
              />
            ) : null}

            {product.notes && (
              <div className="pdp__notes">
                {product.notes.top && (
                  <p>
                    <strong>Topo:</strong> {product.notes.top}
                  </p>
                )}
                {product.notes.heart && (
                  <p>
                    <strong>Coração:</strong> {product.notes.heart}
                  </p>
                )}
                {product.notes.base && (
                  <p>
                    <strong>Fundo:</strong> {product.notes.base}
                  </p>
                )}
              </div>
            )}

            <div className="pdp__actions">
              <button
                type="button"
                className="btn btn--dark btn--lg"
                disabled={product.soldOut}
                onClick={(e) => {
                  if (!add(product, selected)) return;
                  flyToCart(e.currentTarget, product.image || images[0]);
                  setAdded(true);
                  window.setTimeout(() => setAdded(false), 1600);
                }}
              >
                {product.soldOut ? "Indisponível" : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
              </button>
              <Link href="/carrinho" className="btn btn--outline btn--lg">
                Ver carrinho
              </Link>
            </div>

            <div className="pdp__shipping">
              <ShippingEstimator
                compact
                initialCep={shippingDest?.cep ?? ""}
                onQuote={(result) => {
                  if (result) {
                    setShippingDest({ state: result.quote.state, cep: result.cep });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
