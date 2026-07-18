import { prisma } from "@/lib/db";
import { getPaidOrderCounts } from "@/lib/product-popularity";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";
import type { HeroSlide } from "@/lib/types";
import { isFractionalVariant } from "@/lib/utils";

const HERO_CAROUSEL_KEY = "hero_carousel";
const MAX_SLIDES = 8;

export type HeroCarouselConfig = {
  productIds: string[];
};

export type { HeroSlide };

export async function getHeroCarouselConfig(): Promise<HeroCarouselConfig> {
  const row = await prisma.setting.findUnique({ where: { key: HERO_CAROUSEL_KEY } });
  const value = row?.value as { productIds?: unknown } | null;
  const ids = Array.isArray(value?.productIds)
    ? value.productIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return { productIds: ids.slice(0, MAX_SLIDES) };
}

export async function saveHeroCarouselConfig(productIds: string[]) {
  const unique: string[] = [];
  for (const id of productIds) {
    if (typeof id !== "string" || !id || unique.includes(id)) continue;
    unique.push(id);
    if (unique.length >= MAX_SLIDES) break;
  }
  await prisma.setting.upsert({
    where: { key: HERO_CAROUSEL_KEY },
    create: { key: HERO_CAROUSEL_KEY, value: { productIds: unique } },
    update: { value: { productIds: unique } },
  });
  return { productIds: unique };
}

function heroOffer(product: {
  variants: Array<{ label: string; price: number; disabled?: boolean }>;
}): { fromPrice: number; fromLabel: string } | null {
  const variants = product.variants.filter(
    (v) => Number.isFinite(v.price) && v.price >= 0 && !v.disabled,
  );
  if (!variants.length) return null;

  const fractionals = variants.filter((v) => isFractionalVariant(v.label));
  const pool = fractionals.length > 0 ? fractionals : variants;
  const cheapest = pool.reduce((best, v) => (v.price < best.price ? v : best));
  return { fromPrice: cheapest.price, fromLabel: cheapest.label };
}

function toSlide(product: {
  image: string;
  slug: string;
  brand: string;
  name: string;
  variants: Array<{ label: string; price: number; disabled?: boolean }>;
}): HeroSlide | null {
  if (!product.image || !product.slug) return null;
  const offer = heroOffer(product);
  return {
    src: product.image,
    alt: `${product.brand} ${product.name}`,
    brand: product.brand,
    name: product.name,
    slug: product.slug,
    fromPrice: offer?.fromPrice ?? null,
    fromLabel: offer?.fromLabel ?? null,
  };
}

/** Slides do carrossel: admin, ou bestsellers pagos, ou featured + lançamentos. */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const [config, rows, storeConfig, orderCounts] = await Promise.all([
    getHeroCarouselConfig(),
    prisma.product.findMany({ where: { active: true, deletedAt: null } }),
    getStoreConfig(),
    getPaidOrderCounts(),
  ]);

  const products = rows.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig));
  const byId = new Map(products.map((p) => [p.id, p]));

  let selected = config.productIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof products)[number] => Boolean(p?.image));

  if (selected.length === 0) {
    const bySales = [...products]
      .filter((p) => p.image && (orderCounts.get(p.id) ?? 0) > 0)
      .sort((a, b) => (orderCounts.get(b.id) ?? 0) - (orderCounts.get(a.id) ?? 0))
      .slice(0, 6);

    if (bySales.length > 0) {
      selected = bySales;
    } else {
      const featured = products.filter((p) => p.featured);
      const launches = products.filter((p) => p.isLaunch);
      selected = [...featured, ...launches]
        .filter((p, i, arr) => p.image && arr.findIndex((x) => x.id === p.id) === i)
        .slice(0, 6);
    }
  }

  return selected.map(toSlide).filter((s): s is HeroSlide => s != null);
}
