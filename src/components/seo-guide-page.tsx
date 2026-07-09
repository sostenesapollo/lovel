import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import type { SeoPage } from "@/lib/seo/catalog";
import { getRelatedSeoPages, SEO_PAGE_BY_SLUG } from "@/lib/seo/catalog";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/lib/seo/json-ld";
import { categoryPath } from "@/lib/utils";

function pagePath(page: SeoPage) {
  return page.kind === "paraguai" ? `/paraguai/${page.slug}` : `/guia/${page.slug}`;
}

const KIND_LABEL: Record<SeoPage["kind"], string> = {
  perfume: "Perfume",
  intent: "Guia de compra",
  guide: "Guia",
  paraguai: "Paraguai",
  brand: "Marca",
};

export function SeoGuidePage({
  page,
  activeNav = "",
}: {
  page: SeoPage;
  activeNav?: string;
}) {
  const path = pagePath(page);
  const related = getRelatedSeoPages(page, 8);
  const relatedFromSlugs = (page.relatedPerfumes ?? [])
    .map((s) => SEO_PAGE_BY_SLUG[s])
    .filter(Boolean)
    .slice(0, 6);

  const crumbs = [
    { name: "Home", path: "/" },
    page.kind === "paraguai"
      ? { name: "Paraguai", path: "/paraguai" }
      : { name: "Guias", path: "/guia" },
    { name: page.h1, path },
  ];

  const schemas = [
    breadcrumbJsonLd(crumbs),
    articleJsonLd(page, path),
    faqJsonLd(page),
  ].filter(Boolean);

  return (
    <>
      <SiteHeader activeNav={activeNav} />
      <main className="seo-page">
        {schemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        <section className="seo-hero">
          <div className="container">
            <nav className="seo-breadcrumb" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.path} className="seo-breadcrumb__item">
                  {i > 0 && <span className="seo-breadcrumb__sep">/</span>}
                  {i < crumbs.length - 1 ? (
                    <Link href={c.path}>{c.name}</Link>
                  ) : (
                    <span aria-current="page">{c.name}</span>
                  )}
                </span>
              ))}
            </nav>
            <p className="seo-hero__eyebrow">{KIND_LABEL[page.kind]}</p>
            <h1 className="seo-hero__title">{page.h1}</h1>
            <p className="seo-hero__lead">{page.description}</p>
            <div className="seo-hero__actions">
              <Link href={categoryPath("perfumes")} className="btn btn--dark">
                Ver perfumes →
              </Link>
              <Link href="/paraguai" className="btn btn--text">
                Guia Paraguai
              </Link>
            </div>
          </div>
        </section>

        <section className="section seo-body">
          <div className="container seo-body__grid">
            <article className="seo-article">
              {page.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              {page.brand && page.name && (
                <div className="seo-callout">
                  <h2>Comprar {page.brand} {page.name}</h2>
                  <p>
                    Explore a coleção de perfumes da LOVEL, escolha decant para
                    testar na pele ou fale no WhatsApp para indicação de ml e
                    ocasião.
                  </p>
                  <Link
                    href={
                      ["arabes", "grifes", "nicho"].includes(page.subcategory)
                        ? categoryPath("perfumes", page.subcategory)
                        : categoryPath("perfumes")
                    }
                    className="btn btn--dark"
                  >
                    Ir para perfumes
                  </Link>
                </div>
              )}

              {page.faq.length > 0 && (
                <div className="seo-faq">
                  <h2>Perguntas frequentes</h2>
                  {page.faq.map((f) => (
                    <details key={f.q} className="seo-faq__item">
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              )}
            </article>

            <aside className="seo-aside">
              {(relatedFromSlugs.length > 0 || related.length > 0) && (
                <div className="seo-aside__block">
                  <h2>Continue explorando</h2>
                  <ul className="seo-aside__list">
                    {(relatedFromSlugs.length > 0 ? relatedFromSlugs : related).map(
                      (r) => (
                        <li key={r.slug}>
                          <Link href={pagePath(r)}>{r.h1}</Link>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
              <div className="seo-aside__block">
                <h2>Atalhos</h2>
                <ul className="seo-aside__list">
                  <li>
                    <Link href={categoryPath("perfumes", "arabes")}>
                      Perfumes árabes
                    </Link>
                  </li>
                  <li>
                    <Link href={categoryPath("perfumes", "grifes")}>
                      Grifes
                    </Link>
                  </li>
                  <li>
                    <Link href={categoryPath("perfumes", "nicho")}>Nicho</Link>
                  </li>
                  <li>
                    <Link href="/paraguai">Comprar no Paraguai</Link>
                  </li>
                  <li>
                    <Link href="/guia">Todos os guias</Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
