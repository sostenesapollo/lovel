import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { CurationSection } from "@/components/curation-section";
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
        <section className="hero hero--split">
          <div className="hero__copy">
            <div className="hero__copy-inner">
              <h1 className="hero__title">
                A essência da elegância, <em>em cada gota.</em>
              </h1>
              <p className="hero__subtitle">
                Perfumes árabes, grifes e nicho, haircare importado e skincare de alta performance.
                Escolha entre <em>frascos inteiros</em> ou nossos <em>decants</em> a partir de 4ml —
                a experiência de luxo, do seu jeito.
              </p>
              <div className="hero__actions">
                <Link href={categoryPath("perfumes")} className="btn btn--dark">
                  Explorar perfumes →
                </Link>
                <Link href="/categoria?tipo=lancamentos" className="btn btn--text">
                  Ver lançamentos
                </Link>
              </div>
            </div>
          </div>
          <div className="hero__media">
            <Image
              src="/hero-perfume.png"
              alt="Frasco de perfume LOVEL"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              className="hero__img"
            />
          </div>
        </section>

        <CurationSection />

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
              <div className="section__head">
                <h2 className="section__title">Lançamentos</h2>
                <Link href="/categoria?tipo=lancamentos" className="curation__link">
                  Ver todos →
                </Link>
              </div>
              <div className="product-grid">{launches.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">Destaques</h2>
              <Link href={categoryPath("perfumes")} className="curation__link">
                Ver todos →
              </Link>
            </div>
            <div className="product-grid">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </div>
        </section>

        <section className="section section--alt reviews-teaser">
          <div className="container reviews-section__header">
            <p className="reviews-section__eyebrow">Depoimentos</p>
            <h2 className="reviews-section__title">
              Amado por quem entende de <em>essência</em>
            </h2>
            <Link href="/depoimentos" className="btn btn--dark" style={{ marginTop: "1.5rem" }}>
              Ler depoimentos
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
