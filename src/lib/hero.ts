import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";

const HERO_CAROUSEL_KEY = "hero_carousel";
const MAX_SLIDES = 8;

export type HeroCarouselConfig = {
  productIds: string[];
};

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

/** Slides do carrossel da home: config do admin, ou fallback featured + lançamentos. */
export async function getHeroSlides() {
  const config = await getHeroCarouselConfig();
  const rows = await prisma.product.findMany();
  const products = rows.map(parseProduct);
  const byId = new Map(products.map((p) => [p.id, p]));

  let selected = config.productIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.image));

  if (selected.length === 0) {
    const featured = products.filter((p) => p.featured);
    const launches = products.filter((p) => p.isLaunch);
    selected = [...featured, ...launches]
      .filter((p, i, arr) => p.image && arr.findIndex((x) => x.id === p.id) === i)
      .slice(0, 6);
  }

  return selected.map((p) => ({
    src: p.image,
    alt: `${p.brand} ${p.name}`,
    brand: p.brand,
    name: p.name,
  }));
}
