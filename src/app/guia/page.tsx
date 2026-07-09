import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { getSeoPagesByKind } from "@/lib/seo/catalog";
import { absoluteUrl } from "@/lib/seo/site";
import { categoryPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Guias de perfume — decants, marcas e compra | LOVEL" },
  description:
    "Guias LOVEL: perfumes mais pedidos, marcas, decants, fixação e comparação com comprar no Paraguai.",
  alternates: { canonical: absoluteUrl("/guia") },
};

export default function GuiaIndexPage() {
  const perfumes = getSeoPagesByKind("perfume");
  const brands = getSeoPagesByKind("brand");
  const guides = getSeoPagesByKind("guide");
  const intents = getSeoPagesByKind("intent").slice(0, 24);

  return (
    <>
      <SiteHeader />
      <main className="seo-page">
        <section className="seo-hero">
          <div className="container">
            <p className="seo-hero__eyebrow">Guias</p>
            <h1 className="seo-hero__title">Perfumes mais pedidos</h1>
            <p className="seo-hero__lead">
              {perfumes.length} fragrâncias, marcas e intenções de compra —
              com foco em decant, originalidade e alternativa consciente ao
              Paraguai.
            </p>
            <div className="seo-hero__actions">
              <Link href={categoryPath("perfumes")} className="btn btn--dark">
                Loja de perfumes →
              </Link>
              <Link href="/paraguai" className="btn btn--text">
                Guia Paraguai
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section__title">Por ocasião</h2>
            <ul className="seo-index-grid">
              {guides.map((p) => (
                <li key={p.slug}>
                  <Link href={`/guia/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--alt">
          <div className="container">
            <h2 className="section__title">Marcas</h2>
            <ul className="seo-index-grid">
              {brands.map((p) => (
                <li key={p.slug}>
                  <Link href={`/guia/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section__title">Mais pedidos</h2>
            <ul className="seo-index-grid seo-index-grid--dense">
              {perfumes.map((p) => (
                <li key={p.slug}>
                  <Link href={`/guia/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--alt">
          <div className="container">
            <h2 className="section__title">Comprar & preço</h2>
            <ul className="seo-index-grid">
              {intents.map((p) => (
                <li key={p.slug}>
                  <Link href={`/guia/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
            {getSeoPagesByKind("intent").length > intents.length && (
              <p className="seo-index-more">
                +{getSeoPagesByKind("intent").length - intents.length} guias de
                compra no sitemap
              </p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
