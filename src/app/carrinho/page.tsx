"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShippingEstimator } from "@/components/shipping-estimator";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import { cartItemToAnalytics, trackBeginCheckout } from "@/lib/analytics";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { quoteShipping } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const {
    items,
    remove,
    updateQuantity,
    coupon,
    setCoupon,
    totals,
    crossSellOffers,
    add,
    shippingDest,
    setShippingDest,
  } = useCart();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const t = totals("pix");
  const quote = quoteShipping({ state: shippingDest?.state, cep: shippingDest?.cep });
  const freeRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - (t.subtotal - t.discount));

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  const offers = crossSellOffers(products);

  async function applyCoupon() {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, orderTotal: t.subtotal }),
    });
    const data = await res.json();
    if (data.valid) {
      setCoupon(data.coupon);
      setCouponMsg("Cupom aplicado!");
    } else {
      setCoupon(null);
      setCouponMsg(data.message);
    }
  }

  function goCheckout() {
    trackBeginCheckout(
      items.map(cartItemToAnalytics),
      t.total,
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="page page--cart">
        <div className="container">
          <h1 className="page-header__title">Carrinho</h1>
          {items.length === 0 ? (
            <div className="empty-state">
              <p>Seu carrinho está vazio.</p>
              <Link href="/" className="btn btn--gold">Continuar comprando</Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {items.map((item) => (
                  <div key={item.key} className="cart-item">
                    <Image src={item.image} alt={item.name} width={80} height={80} unoptimized />
                    <div className="cart-item__info">
                      <strong>{item.name}</strong>
                      <span>{item.brand} · {item.variantLabel}</span>
                      {item.crossSell && <span className="cart-item__cross">Cross-sell -10%</span>}
                    </div>
                    <div className="cart-item__qty">
                      <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
                    </div>
                    <span className="cart-item__price">{formatPrice(item.price * item.quantity)}</span>
                    <button type="button" className="cart-item__remove" onClick={() => remove(item.key)} aria-label="Remover">×</button>
                  </div>
                ))}

                {offers.length > 0 && (
                  <div className="cross-sell">
                    <h3>Leve o frasco inteiro com 10% OFF</h3>
                    {offers.map(({ product, variantIndex, price }) => (
                      <div key={`${product.id}-${variantIndex}`} className="cross-sell__item">
                        <span>{product.name} — Frasco Inteiro</span>
                        <span>{formatPrice(price)}</span>
                        <button
                          type="button"
                          className="btn btn--dark btn--sm"
                          onClick={() => add(product, variantIndex, { crossSell: true, crossSellPrice: price })}
                        >
                          Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <ShippingEstimator
                  initialCep={shippingDest?.cep ?? ""}
                  onQuote={(result) => {
                    if (result) {
                      setShippingDest({ state: result.quote.state, cep: result.cep });
                    }
                  }}
                />
              </div>

              <aside className="cart-summary">
                <h3>Resumo</h3>
                <div className="cart-summary__row"><span>Subtotal</span><span>{formatPrice(t.subtotal)}</span></div>
                {t.discount > 0 && <div className="cart-summary__row"><span>Desconto</span><span>-{formatPrice(t.discount)}</span></div>}
                <div className="cart-summary__row">
                  <span>Frete{quote?.state ? ` (${quote.state})` : ""}</span>
                  <span>{t.shipping === 0 ? "Grátis" : formatPrice(t.shipping)}</span>
                </div>
                {t.shipping > 0 && freeRemaining > 0 && (
                  <p className="cart-summary__hint">
                    Faltam {formatPrice(freeRemaining)} para frete grátis
                  </p>
                )}
                {quote && t.shipping > 0 && (
                  <p className="cart-summary__hint">
                    Prazo estimado: {quote.etaDays} dias úteis · saída de Foz do Iguaçu
                  </p>
                )}
                {!quote && t.shipping > 0 && (
                  <p className="cart-summary__hint">
                    Frete médio (informe o CEP para ajustar)
                  </p>
                )}
                <div className="cart-summary__row cart-summary__total"><span>Total PIX</span><span>{formatPrice(t.total)}</span></div>
                <div className="coupon-form">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Cupom" />
                  <button type="button" className="btn btn--outline" onClick={applyCoupon}>Aplicar</button>
                </div>
                {couponMsg && <p className="coupon-msg">{couponMsg}</p>}
                {coupon && <p className="coupon-applied">Cupom {coupon.code} aplicado</p>}
                <Link href="/checkout" className="btn btn--gold btn--full" onClick={goCheckout}>
                  Finalizar compra
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
