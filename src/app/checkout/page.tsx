"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import {
  cartItemToAnalytics,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackPurchase,
} from "@/lib/analytics";
import { CROSS_SELL_DISCOUNT } from "@/lib/constants";
import { formatCep, onlyDigits, quoteShipping } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import { formatPrice, getVariant } from "@/lib/utils";

const CHECKOUT_FORM_KEY = "lovel_checkout_form";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome completo",
  email: "E-mail",
  phone: "Telefone / WhatsApp",
  cpf: "CPF",
  cep: "CEP",
  street: "Rua",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado (UF)",
};

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const EMPTY_FORM: CheckoutForm = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export default function CheckoutPage() {
  const {
    items,
    totals,
    clear,
    markPurchased,
    coupon,
    add,
    crossSellOffers,
    shippingDest,
    setShippingDest,
  } = useCart();
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState("");
  const [formReady, setFormReady] = useState(false);
  const [bumpProducts, setBumpProducts] = useState<Product[]>([]);
  const [success, setSuccess] = useState<{
    orderId: string;
    total: number;
    shipping: number;
    items: ReturnType<typeof cartItemToAnalytics>[];
    coupon?: string;
    pixCode?: string | null;
    pixQrCodeBase64?: string | null;
  } | null>(null);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const purchaseTracked = useRef(false);
  const shippingTracked = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_FORM_KEY);
      const dest = (() => {
        try {
          return JSON.parse(localStorage.getItem("lovel_shipping_dest") || "null") as {
            cep?: string;
            state?: string;
          } | null;
        } catch {
          return null;
        }
      })();
      if (saved) {
        const parsed = { ...EMPTY_FORM, ...JSON.parse(saved) } as CheckoutForm;
        if (dest?.cep && !parsed.cep) {
          parsed.cep = dest.cep;
          if (dest.state && !parsed.state) parsed.state = dest.state;
        }
        setForm(parsed);
      } else if (dest?.cep) {
        setForm({ ...EMPTY_FORM, cep: dest.cep, state: dest.state ?? "" });
      }
    } catch {
      /* ignore */
    }
    setFormReady(true);
  }, []);

  useEffect(() => {
    if (!formReady) return;
    localStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(form));
  }, [form, formReady]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((list: Product[]) => setBumpProducts(Array.isArray(list) ? list : []))
      .catch(() => setBumpProducts([]));
  }, []);

  const t = totals(payment);
  const offers = useMemo(() => crossSellOffers(bumpProducts).slice(0, 2), [bumpProducts, crossSellOffers]);
  const quote = quoteShipping({ state: form.state || shippingDest?.state, cep: form.cep || shippingDest?.cep });

  useEffect(() => {
    if (success && !purchaseTracked.current) {
      purchaseTracked.current = true;
      trackPurchase({
        transactionId: success.orderId,
        value: success.total,
        shipping: success.shipping,
        items: success.items,
        coupon: success.coupon,
      });
    }
  }, [success]);

  function updateField<K extends keyof CheckoutForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function lookupCep(raw: string) {
    const digits = onlyDigits(raw);
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) return;

      const next: CheckoutForm = {
        ...form,
        cep: formatCep(digits),
        street: data.logradouro || form.street,
        neighborhood: data.bairro || form.neighborhood,
        city: data.localidade || form.city,
        state: data.uf || form.state,
      };
      setForm(next);
      setShippingDest({ state: next.state, cep: next.cep });

      if (!shippingTracked.current) {
        shippingTracked.current = true;
        const q = quoteShipping({ state: next.state, cep: next.cep });
        trackAddShippingInfo(
          items.map(cartItemToAnalytics),
          totals(payment).total,
          q?.regionLabel,
        );
      }
    } catch {
      /* ViaCEP offline — CEP ainda serve para frete regional */
      const q = quoteShipping({ cep: digits });
      if (q) setShippingDest({ state: q.state, cep: formatCep(digits) });
    } finally {
      setCepLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError("");

    trackAddPaymentInfo(items.map(cartItemToAnalytics), t.total, payment);

    const analyticsItems = items.map(cartItemToAnalytics);
    const orderTotal = t.total;
    const orderShipping = t.shipping;
    const orderCoupon = coupon?.code;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: form,
        items,
        payment,
        coupon,
        subtotal: t.subtotal,
        discount: t.discount,
        shipping: t.shipping,
        total: t.total,
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (data.success) {
      markPurchased();
      clear();
      setSuccess({
        orderId: data.orderId,
        total: orderTotal,
        shipping: orderShipping,
        items: analyticsItems,
        coupon: orderCoupon,
        pixCode: data.pixCode,
        pixQrCodeBase64: data.pixQrCodeBase64,
      });
    } else {
      setError(data.message || "Não foi possível criar o pedido.");
    }
  }

  if (success) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <div className="container checkout-success">
            <div className="checkout-success__card">
              <h1>Pedido recebido</h1>
              <p>
                Número: <strong>{success.orderId}</strong>
              </p>
              <p className="checkout-success__hint">
                {success.pixCode
                  ? "Pagamento gerado. Conclua o PIX abaixo para confirmarmos seu pedido."
                  : "Recebemos seu pedido. Em breve você receberá atualizações por e-mail."}
              </p>
              {success.pixQrCodeBase64 && (
                <div className="pix-box">
                  <p>Escaneie o QR Code PIX</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${success.pixQrCodeBase64}`}
                    alt="QR Code PIX"
                    width={220}
                    height={220}
                    style={{ margin: "1rem auto", display: "block" }}
                  />
                </div>
              )}
              {success.pixCode && (
                <div className="pix-box">
                  <p>Ou copie o código PIX</p>
                  <code style={{ wordBreak: "break-all" }}>{success.pixCode}</code>
                </div>
              )}
              <Link href="/conta" className="btn btn--dark btn--full">
                Ver meus pedidos
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="page page--checkout">
        <div className="container checkout-layout">
          <form className="checkout-form" onSubmit={submit}>
            <h1>Finalizar compra</h1>
            <p className="checkout-form__lead">Seus dados ficam salvos neste aparelho para a próxima compra.</p>

            <fieldset className="form-section">
              <legend>Dados pessoais</legend>
              <div className="form-grid">
                {(["name", "email", "phone", "cpf"] as const).map((field) => (
                  <label key={field} className={`form-field${field === "name" || field === "email" ? " form-field--full" : ""}`}>
                    <span>{FIELD_LABELS[field]}</span>
                    <input
                      required={field !== "cpf"}
                      type={field === "email" ? "email" : "text"}
                      autoComplete={field === "name" ? "name" : field === "email" ? "email" : field === "phone" ? "tel" : "off"}
                      value={form[field]}
                      onChange={(e) => updateField(field, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Endereço de entrega</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>{FIELD_LABELS.cep}{cepLoading ? " · buscando…" : ""}</span>
                  <input
                    required
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={form.cep}
                    onChange={(e) => {
                      const next = formatCep(e.target.value);
                      updateField("cep", next);
                      const digits = onlyDigits(next);
                      if (digits.length === 8) {
                        const q = quoteShipping({ cep: digits });
                        if (q) setShippingDest({ state: q.state, cep: next });
                        void lookupCep(next);
                      }
                    }}
                    onBlur={() => void lookupCep(form.cep)}
                  />
                </label>
                {(["street", "number", "complement", "neighborhood", "city", "state"] as const).map((field) => (
                  <label
                    key={field}
                    className={`form-field${field === "street" || field === "neighborhood" ? " form-field--full" : ""}`}
                  >
                    <span>{FIELD_LABELS[field]}</span>
                    <input
                      required={field !== "complement"}
                      maxLength={field === "state" ? 2 : undefined}
                      autoComplete={
                        field === "street"
                          ? "street-address"
                          : field === "city"
                            ? "address-level2"
                            : field === "state"
                              ? "address-level1"
                              : "off"
                      }
                      value={form[field]}
                      onChange={(e) => {
                        const value = field === "state" ? e.target.value.toUpperCase() : e.target.value;
                        updateField(field, value);
                        if (field === "state" && value.length === 2) {
                          setShippingDest({ state: value, cep: form.cep });
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
              {quote && t.shipping > 0 && (
                <p className="form-hint">
                  Frete estimado para {quote.regionLabel}
                  {quote.state ? ` (${quote.state})` : ""}: {formatPrice(quote.price)} · {quote.etaDays} dias úteis
                  (saída do Paraná)
                </p>
              )}
            </fieldset>

            <fieldset className="form-section">
              <legend>Forma de pagamento</legend>
              <div className="payment-options">
                <button
                  type="button"
                  className={`payment-option${payment === "pix" ? " payment-option--active" : ""}`}
                  onClick={() => setPayment("pix")}
                >
                  <span className="payment-option__label">PIX</span>
                  <span className="payment-option__desc">5% de desconto · aprovação imediata</span>
                </button>
                <button
                  type="button"
                  className={`payment-option${payment === "card" ? " payment-option--active" : ""}`}
                  onClick={() => setPayment("card")}
                >
                  <span className="payment-option__label">Cartão</span>
                  <span className="payment-option__desc">Crédito em até 3x</span>
                </button>
              </div>
            </fieldset>

            {offers.length > 0 && (
              <section className="order-bump">
                <h3 className="order-bump__title">Aproveite e leve também</h3>
                <p className="order-bump__sub">Oferta exclusiva neste checkout — {Math.round(CROSS_SELL_DISCOUNT * 100)}% OFF</p>
                <div className="order-bump__list">
                  {offers.map((offer) => {
                    const { product } = offer;
                    const variant = getVariant(product, offer.variantIndex);
                    const already = items.some(
                      (i) => i.productId === product.id && i.variantIndex === offer.variantIndex,
                    );
                    return (
                      <div key={`${product.id}-${offer.variantIndex}`} className="order-bump__item">
                        <Image
                          src={product.image || "/product-placeholder.svg"}
                          alt={product.name}
                          width={72}
                          height={72}
                          unoptimized
                          className="order-bump__img"
                        />
                        <div className="order-bump__info">
                          <strong>{product.name}</strong>
                          <span>{variant.label}</span>
                          <div className="order-bump__prices">
                            <span className="order-bump__old">{formatPrice(variant.price)}</span>
                            <span className="order-bump__new">{formatPrice(offer.price)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn--dark btn--sm"
                          disabled={already}
                          onClick={() =>
                            add(product, offer.variantIndex, {
                              crossSell: true,
                              crossSellPrice: offer.price,
                            })
                          }
                        >
                          {already ? "Adicionado" : "Adicionar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="btn btn--pay btn--full"
              disabled={loading || items.length === 0}
            >
              {loading
                ? "Gerando pagamento…"
                : payment === "pix"
                  ? `Pagar com PIX · ${formatPrice(t.total)}`
                  : `Pagar com cartão · ${formatPrice(t.total)}`}
            </button>
            <p className="checkout-secure">Pagamento seguro · dados protegidos</p>
          </form>

          <aside className="checkout-summary">
            <h3>Resumo do pedido</h3>
            <div className="co-items">
              {items.map((item) => (
                <div key={item.key + (item.crossSell ? "-bump" : "")} className="co-item">
                  <span>
                    {item.quantity}× {item.name} ({item.variantLabel})
                    {item.crossSell ? " · oferta" : ""}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length === 0 && <p className="form-hint">Seu carrinho está vazio.</p>}
            </div>
            <div className="cart-summary__row">
              <span>Subtotal</span>
              <span>{formatPrice(t.subtotal)}</span>
            </div>
            {t.discount > 0 && (
              <div className="cart-summary__row">
                <span>Descontos</span>
                <span>−{formatPrice(t.discount)}</span>
              </div>
            )}
            <div className="cart-summary__row">
              <span>Frete{quote?.state ? ` (${quote.state})` : ""}</span>
              <span>{t.shipping === 0 ? "Grátis" : formatPrice(t.shipping)}</span>
            </div>
            {quote && t.shipping > 0 && (
              <p className="cart-summary__hint">
                {quote.etaDays} dias úteis · Paraná → {quote.regionLabel}
              </p>
            )}
            <div className="cart-summary__row cart-summary__total">
              <span>Total</span>
              <span>{formatPrice(t.total)}</span>
            </div>
            <Link href="/carrinho" className="btn btn--link">
              ← Voltar ao carrinho
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
