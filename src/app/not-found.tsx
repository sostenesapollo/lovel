import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { categoryPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="error-page">
        <div className="error-page__inner">
          <div className="error-page__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/oops.gif"
              alt="Momento caótico — página não encontrada"
              width={220}
              height={220}
              className="error-page__gif"
            />
          </div>

          <p className="error-page__code">404</p>
          <h1 className="error-page__title">
            Ops… essa essência <em>evaporou</em>.
          </h1>
          <p className="error-page__text">
            A página que você procura não está no nosso estoque. Que tal
            explorar as fragrâncias que ainda estão por aqui?
          </p>

          <div className="error-page__actions">
            <Link href="/" className="btn btn--dark">
              Voltar à loja
            </Link>
            <Link href={categoryPath("perfumes")} className="btn btn--text">
              Ver perfumes →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
