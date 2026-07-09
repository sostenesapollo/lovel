import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { getSeoPagesByKind } from "@/lib/seo/catalog";
import { absoluteUrl } from "@/lib/seo/site";
import { categoryPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    absolute: "Comprar perfume no Paraguai — guia completo | LOVEL",
  },
  description:
    "Guia LOVEL: comprar perfume no Paraguai, Ciudad del Este, riscos de réplica, preços e alternativa com decants originais no Brasil.",
  alternates: { canonical: absoluteUrl("/paraguai") },
};

export default function ParaguaiIndexPage() {
  const pages = getSeoPagesByKind("paraguai");
  const cities = pages.filter((p) => p.slug.startsWith("perfume-paraguai-"));
  const guides = pages.filter((p) => !p.slug.startsWith("perfume-paraguai-"));

  return (
    <>
      <SiteHeader activeNav="paraguai" />
      <main className="seo-page">
        <section className="seo-hero">
          <div className="container">
            <p className="seo-hero__eyebrow">Paraguai</p>
            <h1 className="seo-hero__title">
              Comprar perfume no Paraguai
            </h1>
            <p className="seo-hero__lead">
              Ciudad del Este, preços, golpes e quando o decant da LOVEL faz
              mais sentido do que a fronteira.
            </p>
            <div className="seo-hero__actions">
              <Link href={categoryPath("perfumes")} className="btn btn--dark">
                Ver perfumes LOVEL →
              </Link>
              <Link
                href="/paraguai/comprar-perfume-no-paraguai"
                className="btn btn--text"
              >
                Guia completo
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container seo-body__prose">
            <p>
              Buscas por “perfume barato no Paraguai” e “Ciudad del Este
              perfumes” explodem no Brasil. A economia pode existir — o risco
              de réplica e o custo da viagem também. Estes guias ajudam a
              decidir com clareza.
            </p>
          </div>
        </section>

        <section className="section section--alt">
          <div className="container">
            <h2 className="section__title">Guias essenciais</h2>
            <ul className="seo-index-grid">
              {guides.map((p) => (
                <li key={p.slug}>
                  <Link href={`/paraguai/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section__title">Por cidade</h2>
            <ul className="seo-index-grid seo-index-grid--dense">
              {cities.map((p) => (
                <li key={p.slug}>
                  <Link href={`/paraguai/${p.slug}`}>{p.h1}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
