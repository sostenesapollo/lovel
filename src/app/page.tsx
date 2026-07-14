import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { CurationSection } from "@/components/curation-section";
import { ReviewsSection } from "@/components/reviews-section";
import { ProductCard } from "@/components/product-card";
import { HeroMedia } from "@/components/hero-media";
import { prisma } from "@/lib/db";
import { getHeroSlides } from "@/lib/hero";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";
import { categoryPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rows, heroSlides, storeConfig, homeCategories] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    getHeroSlides(),
    getStoreConfig(),
    prisma.category.findMany({
      where: { showOnHome: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true, subtitle: true, image: true },
    }),
  ]);
  const products = rows.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig));
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
          <HeroMedia slides={heroSlides} />
        </section>

        <CurationSection categories={homeCategories} />

        {launches.length > 0 && (
          <section className="section">
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

        <section className="section section--alt">
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

        <ReviewsSection />
      </main>
      <SiteFooter />
    </>
  );
}
