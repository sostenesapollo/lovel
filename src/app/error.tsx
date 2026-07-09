"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="error-page">
        <div className="error-page__inner">
          <div className="error-page__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/oops.gif"
              alt="Algo deu errado"
              width={220}
              height={220}
              className="error-page__gif"
            />
          </div>

          <p className="error-page__code">Ops</p>
          <h1 className="error-page__title">
            Algo saiu do <em>frasco</em>.
          </h1>
          <p className="error-page__text">
            Tivemos um imprevisto por aqui. Tente de novo ou volte à loja —
            as essências continuam no lugar.
          </p>

          <div className="error-page__actions">
            <button type="button" className="btn btn--dark" onClick={reset}>
              Tentar de novo
            </button>
            <Link href="/" className="btn btn--text">
              Voltar à loja →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
