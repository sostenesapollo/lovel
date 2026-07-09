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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    orderId: string;
    pixCode?: string | null;
    pixQrCodeBase64?: string | null;
  } | null>(null);
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
    setError("");

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
            <h1>Pedido confirmado!</h1>
            <p>
              Número: <strong>{success.orderId}</strong>
            </p>
            {success.pixQrCodeBase64 && (
              <div className="pix-box">
                <p>Escaneie o QR Code PIX:</p>
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
                <p>Ou copie o código PIX:</p>
                <code style={{ wordBreak: "break-all" }}>{success.pixCode}</code>
              </div>
            )}
            <Link href="/conta" className="btn btn--gold">
              Ver meus pedidos
            </Link>
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
                <span>
                  {field === "name"
                    ? "Nome"
                    : field === "email"
                      ? "E-mail"
                      : field === "phone"
                        ? "Telefone"
                        : "CPF"}
                </span>
                <input
                  required={field !== "cpf"}
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </label>
            ))}
            <h3>Endereço</h3>
            {(["cep", "street", "number", "complement", "neighborhood", "city", "state"] as const).map(
              (field) => (
                <label key={field} className="form-field">
                  <span>{field.toUpperCase()}</span>
                  <input
                    required={field !== "complement"}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </label>
              ),
            )}

            <div className="payment-options">
              <label>
                <input
                  type="radio"
                  checked={payment === "pix"}
                  onChange={() => setPayment("pix")}
                />{" "}
                PIX (-5%)
              </label>
              <label>
                <input
                  type="radio"
                  checked={payment === "card"}
                  onChange={() => setPayment("card")}
                />{" "}
                Cartão
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="btn btn--gold btn--full"
              disabled={loading || items.length === 0}
            >
              {loading ? "Processando…" : `Pagar ${formatPrice(t.total)}`}
            </button>
          </form>

          <aside className="cart-summary">
            <h3>Resumo ({items.length} itens)</h3>
            <div className="cart-summary__row">
              <span>Subtotal</span>
              <span>{formatPrice(t.subtotal)}</span>
            </div>
            <div className="cart-summary__row">
              <span>Frete</span>
              <span>{t.shipping === 0 ? "Grátis" : formatPrice(t.shipping)}</span>
            </div>
            <div className="cart-summary__row cart-summary__total">
              <span>Total</span>
              <span>{formatPrice(t.total)}</span>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
