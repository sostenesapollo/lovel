"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/safe-image";
import { ShippingEstimator } from "@/components/shipping-estimator";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import { cartItemToAnalytics, trackBeginCheckout } from "@/lib/analytics";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { quoteShipping } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import { formatPrice, getVariant } from "@/lib/utils";

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
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    fetch(`/api/products?ids=${ids.map(encodeURIComponent).join(",")}`)
      .then((r) => r.json())
      .then((data: Product[] | { items: Product[] }) =>
        setProducts(Array.isArray(data) ? data : data.items ?? []),
      )
      .catch(() => setProducts([]));
  }, [items]);

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
                    <SafeImage
                      src={item.image}
                      alt={item.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="cart-item__img"
                    />
                    <div className="cart-item__info">
                      <span className="cart-item__brand">{item.brand}</span>
                      <strong className="cart-item__name">{item.name}</strong>
                      <span className="cart-item__variant">{item.variantLabel}</span>
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
                    <div className="cross-sell__header">
                      <h3>Leve o frasco inteiro</h3>
                      <span className="cross-sell__badge">10% OFF</span>
                    </div>
                    <p className="cross-sell__desc">Oferta exclusiva no carrinho</p>
                    <div className="cross-sell__list">
                      {offers.map(({ product, variantIndex, price }) => {
                        const variant = getVariant(product, variantIndex);
                        const already = items.some(
                          (i) => i.productId === product.id && i.variantIndex === variantIndex,
                        );
                        return (
                          <div key={`${product.id}-${variantIndex}`} className="cross-sell__item">
                            <SafeImage
                              src={product.image}
                              alt={product.name}
                              width={56}
                              height={56}
                              unoptimized
                              className="cross-sell__img"
                            />
                            <div className="cross-sell__info">
                              <strong>{product.name}</strong>
                              <span>{variant.label}</span>
                              <div className="cross-sell__prices">
                                <span className="cross-sell__old">{formatPrice(variant.price)}</span>
                                <span className="cross-sell__new">{formatPrice(price)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="cross-sell__add"
                              disabled={already}
                              onClick={() =>
                                add(product, variantIndex, { crossSell: true, crossSellPrice: price })
                              }
                            >
                              {already ? "No carrinho" : "Adicionar"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
                    Prazo estimado: {quote.etaDays} dias úteis · saída do Paraná
                  </p>
                )}
                {!quote && t.shipping > 0 && (
                  <p className="cart-summary__hint">
                    Frete médio (informe o CEP para ajustar)
                  </p>
                )}
                <div className="cart-summary__row cart-summary__total"><span>Total PIX</span><span>{formatPrice(t.total)}</span></div>
                <div className="coupon-form">
                  <label className="coupon-form__label" htmlFor="cart-coupon">
                    Cupom de desconto
                  </label>
                  <div className="coupon-form__row">
                    <input
                      id="cart-coupon"
                      className="coupon-form__input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Digite o cupom"
                      autoComplete="off"
                    />
                    <button type="button" className="coupon-form__btn" onClick={applyCoupon}>
                      Aplicar
                    </button>
                  </div>
                </div>
                {couponMsg && (
                  <p className={`coupon-msg${coupon ? " coupon-msg--ok" : " coupon-msg--err"}`}>
                    {couponMsg}
                  </p>
                )}
                {coupon && !couponMsg && (
                  <p className="coupon-msg coupon-msg--ok">Cupom {coupon.code} aplicado</p>
                )}
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
