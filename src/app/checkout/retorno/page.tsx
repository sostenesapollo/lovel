"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";

function RetornoContent() {
  const params = useSearchParams();
  const status = params.get("status") ?? "pending";
  const orderId = params.get("orderId");

  const copy =
    status === "success"
      ? {
          title: "Pagamento aprovado",
          hint: "Recebemos a confirmação do cartão. Em breve você recebe o e-mail de confirmação.",
        }
      : status === "failure"
        ? {
            title: "Pagamento não concluído",
            hint: "O pagamento foi cancelado ou recusado. Você pode tentar novamente pelo checkout.",
          }
        : {
            title: "Pagamento em análise",
            hint: "Assim que o Mercado Pago confirmar, atualizamos o status do seu pedido.",
          };

  return (
    <div className="auth-card">
      <h1>{copy.title}</h1>
      {orderId && (
        <p>
          Pedido: <strong>{orderId}</strong>
        </p>
      )}
      <p className="auth-message">{copy.hint}</p>
      <div className="auth-links" style={{ width: "100%" }}>
        <Link href="/conta" className="btn btn--gold btn--full" style={{ textAlign: "center" }}>
          Ver meus pedidos
        </Link>
        {status !== "success" && (
          <Link href="/checkout" className="btn btn--link">
            Voltar ao checkout
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CheckoutRetornoPage() {
  return (
    <>
      <SiteHeader />
      <main className="page page--account">
        <div className="container account-layout">
          <Suspense fallback={<div className="auth-card"><p className="auth-message">Carregando…</p></div>}>
            <RetornoContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
