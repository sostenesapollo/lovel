import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { CurationSection } from "@/components/curation-section";
import { OfferCountdown } from "@/components/offer-countdown";
import { ReviewsSection } from "@/components/reviews-section";
import { ProductCard } from "@/components/product-card";
import { HeroSplit } from "@/components/hero-split";
import { TrustBar } from "@/components/trust-bar";
import { prisma } from "@/lib/db";
import { getHeroSlides } from "@/lib/hero";
import { countPaidOrders } from "@/lib/product-popularity";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";
import { categoryPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rows, heroSlides, storeConfig, homeCategories, paidOrderCount] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    getHeroSlides(),
    getStoreConfig(),
    prisma.category.findMany({
      where: { showOnHome: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true, subtitle: true, image: true },
    }),
    countPaidOrders(),
  ]);
  const products = rows.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig));
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const launches = products.filter((p) => p.isLaunch).slice(0, 4);

  return (
    <>
      <SiteHeader activeNav="home" />
      <main>
        <HeroSplit slides={heroSlides} paidOrderCount={paidOrderCount} />

        <section className="flash-strip" aria-label="Oferta do dia">
          <div className="container flash-strip__inner">
            <p className="flash-strip__copy">
              Condições especiais do dia · PIX −5% · cupom <strong>PRIMEIRACOMPRA</strong>
            </p>
            <OfferCountdown label="Termina em" percent={8} />
          </div>
        </section>

        <div className="container">
          <TrustBar />
        </div>

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
