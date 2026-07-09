"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, totals, clear, markPurchased, coupon } = useCart();
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string; pixCode?: string } | null>(null);
  const [form, setForm] = useState({
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
  });

  const t = totals(payment);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);

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
      setSuccess({ orderId: data.orderId, pixCode: data.pixCode });
    }
  }

  if (success) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <div className="container checkout-success">
            <h1>Pedido confirmado!</h1>
            <p>Número: <strong>{success.orderId}</strong></p>
            {success.pixCode && (
              <div className="pix-box">
                <p>Copie o código PIX:</p>
                <code>{success.pixCode}</code>
              </div>
            )}
            <Link href="/conta" className="btn btn--gold">Ver meus pedidos</Link>
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
            <h1>Checkout</h1>
            {(["name", "email", "phone", "cpf"] as const).map((field) => (
              <label key={field} className="form-field">
                <span>{field === "name" ? "Nome" : field === "email" ? "E-mail" : field === "phone" ? "Telefone" : "CPF"}</span>
                <input
                  required={field !== "cpf"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </label>
            ))}
            <h3>Endereço</h3>
            {(["cep", "street", "number", "complement", "neighborhood", "city", "state"] as const).map((field) => (
              <label key={field} className="form-field">
                <span>{field.toUpperCase()}</span>
                <input
                  required={field !== "complement"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </label>
            ))}

            <div className="payment-options">
              <label><input type="radio" checked={payment === "pix"} onChange={() => setPayment("pix")} /> PIX (-5%)</label>
              <label><input type="radio" checked={payment === "card"} onChange={() => setPayment("card")} /> Cartão</label>
            </div>

            <button type="submit" className="btn btn--gold btn--full" disabled={loading || items.length === 0}>
              {loading ? "Processando…" : `Pagar ${formatPrice(t.total)}`}
            </button>
          </form>

          <aside className="cart-summary">
            <h3>Resumo ({items.length} itens)</h3>
            <div className="cart-summary__row"><span>Subtotal</span><span>{formatPrice(t.subtotal)}</span></div>
            <div className="cart-summary__row"><span>Frete</span><span>{t.shipping === 0 ? "Grátis" : formatPrice(t.shipping)}</span></div>
            <div className="cart-summary__row cart-summary__total"><span>Total</span><span>{formatPrice(t.total)}</span></div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
