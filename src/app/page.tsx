import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";
import { categoryPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await prisma.product.findMany();
  let categories: Awaited<ReturnType<typeof prisma.category.findMany>> = [];
  try {
    categories = await prisma.category.findMany({
      where: { showOnHome: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    categories = [];
  }
  const products = rows.map(parseProduct);
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const launches = products.filter((p) => p.isLaunch).slice(0, 4);

  return (
    <>
      <SiteHeader activeNav="home" />
      <main>
        <section className="hero">
          <div className="container hero__inner">
            <div className="hero__content">
              <p className="hero__eyebrow">Boutique · Essence · Soin</p>
              <h1 className="hero__title">Essências que contam histórias</h1>
              <p className="hero__subtitle">
                Decants exclusivos, frascos inteiros e skincare importado selecionado para você.
              </p>
              <div className="hero__actions">
                <Link href={categoryPath("perfumes")} className="btn btn--gold">Explorar Perfumes</Link>
                <Link href="/categoria?tipo=lancamentos" className="btn btn--outline">Lançamentos</Link>
              </div>
            </div>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="section">
            <div className="container">
              <h2 className="section__title">Categorias</h2>
              <div className="category-grid">
                {categories.map((cat) => (
                  <Link key={cat.id} className="category-card" href={categoryPath(cat.slug)}>
                    <div
                      className="category-card__visual"
                      style={cat.image ? { backgroundImage: `url(${cat.image})` } : undefined}
                    />
                    <div className="category-card__bg" />
                    <div className="category-card__content">
                      <h3 className="category-card__title">{cat.title}</h3>
                      <p className="category-card__sub">{cat.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {launches.length > 0 && (
          <section className="section section--alt">
            <div className="container">
              <h2 className="section__title">Lançamentos</h2>
              <div className="product-grid">{launches.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <h2 className="section__title">Destaques</h2>
            <div className="product-grid">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
