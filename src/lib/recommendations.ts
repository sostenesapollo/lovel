import { CATEGORIES } from "@/lib/constants";
import { topKeys, type TasteProfile } from "@/lib/browsing-taste";
import type { Product } from "@/lib/types";

export type RecommendSection = {
  id: string;
  eyebrow: string;
  title: string;
  products: Product[];
  href?: string;
};

type BuildOptions = {
  catalog: Product[];
  excludeIds?: string[];
  seed?: Product | null;
  /** Tipo da página (categoria) quando não há produto seed */
  contextType?: string;
  taste?: TasteProfile | null;
  /** IDs já listados na página (ex.: grid da categoria) */
  alreadyShownIds?: string[];
  limitPerSection?: number;
  maxSections?: number;
};

const COMPLEMENT: Record<string, string[]> = {
  perfumes: ["cabelos", "skincare"],
  cabelos: ["skincare", "perfumes"],
  skincare: ["cabelos", "perfumes"],
};

const TYPE_LABEL: Record<string, string> = {
  perfumes: "perfumes",
  cabelos: "cabelos",
  skincare: "skincare",
};

const ALL_TYPES = ["perfumes", "cabelos", "skincare"] as const;

function subLabel(type: string, sub: string): string {
  const cat = CATEGORIES[type as keyof typeof CATEGORIES];
  if (!cat) return sub;
  return cat.subcategories.find((s) => s.slug === sub)?.label ?? sub;
}

function scoreProduct(
  product: Product,
  opts: {
    seed?: Product | null;
    taste?: TasteProfile | null;
    preferType?: string;
    preferSub?: string;
    preferBrand?: string;
  },
): number {
  let score = 0;
  const { seed, taste, preferType, preferSub, preferBrand } = opts;
  const subs = product.subcategories?.length
    ? product.subcategories
    : product.subcategory
      ? [product.subcategory]
      : [];

  if (preferType && product.type === preferType) score += 40;
  if (preferSub && subs.includes(preferSub)) score += 55;
  if (preferBrand && product.brand.toLowerCase() === preferBrand.toLowerCase()) score += 45;

  if (seed) {
    if (product.type === seed.type) score += 18;
    const seedSubs = seed.subcategories?.length
      ? seed.subcategories
      : seed.subcategory
        ? [seed.subcategory]
        : [];
    if (seedSubs.some((s) => subs.includes(s))) score += 42;
    if (product.brand && seed.brand && product.brand.toLowerCase() === seed.brand.toLowerCase()) {
      score += 28;
    }
  }

  if (taste) {
    score += (taste.types[product.type] ?? 0) * 12;
    for (const s of subs) score += (taste.subs[s] ?? 0) * 18;
    score += (taste.brands[product.brand.toLowerCase()] ?? 0) * 14;
  }

  if (product.featured) score += 6;
  if (product.isLaunch) score += 5;
  if (product.soldOut) score -= 100;

  return score;
}

function pick(
  catalog: Product[],
  used: Set<string>,
  limit: number,
  scoreFn: (p: Product) => number,
  minScore = 1,
): Product[] {
  return catalog
    .filter((p) => !used.has(p.id) && !p.soldOut && scoreFn(p) >= minScore)
    .sort((a, b) => scoreFn(b) - scoreFn(a) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function typeTitle(type: string): string {
  return CATEGORIES[type as keyof typeof CATEGORIES]?.title ?? TYPE_LABEL[type] ?? type;
}

function complementTitle(type: string): string {
  if (type === "perfumes") return "Explore perfumes";
  if (type === "cabelos") return "Cuidados para os cabelos";
  return "Skincare para completar";
}

/**
 * Monta seções de recomendação sem repetir produtos entre si
 * nem os já vistos na página atual.
 */
export function buildRecommendationSections(options: BuildOptions): RecommendSection[] {
  const {
    catalog,
    excludeIds = [],
    seed = null,
    contextType,
    taste = null,
    alreadyShownIds = [],
    limitPerSection = 40,
    maxSections = 6,
  } = options;

  const used = new Set<string>([...excludeIds, ...alreadyShownIds, ...(seed ? [seed.id] : [])]);
  const sections: RecommendSection[] = [];

  const push = (section: RecommendSection | null) => {
    if (!section || section.products.length === 0) return;
    if (sections.length >= maxSections) return;
    for (const p of section.products) used.add(p.id);
    sections.push(section);
  };

  // 1) Mesma linha do produto atual (subcategoria / tipo)
  if (seed) {
    const preferSub = seed.subcategory || seed.subcategories?.[0] || "";
    const similar = pick(
      catalog,
      used,
      limitPerSection,
      (p) =>
        scoreProduct(p, {
          seed,
          taste,
          preferType: seed.type,
          preferSub,
          preferBrand: seed.brand,
        }),
      8,
    );
    if (similar.length) {
      const label = preferSub ? subLabel(seed.type, preferSub) : typeTitle(seed.type);
      push({
        id: "similar",
        eyebrow: "Sugestões",
        title: preferSub
          ? `Mais em ${label}`
          : seed.name
            ? `Parecidos com ${seed.name}`
            : `Outras opções em ${label}`,
        products: similar,
        href: preferSub
          ? `/categoria?tipo=${seed.type}&sub=${preferSub}`
          : `/categoria?tipo=${seed.type}`,
      });
    }
  } else if (contextType && contextType !== "lancamentos" && taste && taste.views.length >= 2) {
    const topSub = topKeys(taste.subs, 1)[0];
    const tasteSame = pick(
      catalog,
      used,
      limitPerSection,
      (p) =>
        scoreProduct(p, {
          taste,
          preferType: contextType,
          preferSub: topSub,
        }),
      8,
    );
    if (tasteSame.length) {
      push({
        id: "taste-in-category",
        eyebrow: "Para você",
        title: topSub
          ? `Do seu gosto · ${subLabel(contextType, topSub)}`
          : "Escolhas alinhadas ao que você viu",
        products: tasteSame,
        href: topSub
          ? `/categoria?tipo=${contextType}&sub=${topSub}`
          : `/categoria?tipo=${contextType}`,
      });
    }
  }

  // 2) Com base no histórico de navegação
  if (seed && taste && taste.views.length >= 2) {
    const topType = topKeys(taste.types, 1)[0];
    const topSub = topKeys(taste.subs, 1)[0];
    const topBrand = topKeys(taste.brands, 1)[0];
    const tastePicks = pick(
      catalog,
      used,
      limitPerSection,
      (p) =>
        scoreProduct(p, {
          seed,
          taste,
          preferType: topType,
          preferSub: topSub,
          preferBrand: topBrand,
        }),
      6,
    );
    if (tastePicks.length) {
      push({
        id: "taste",
        eyebrow: "Para você",
        title: topSub
          ? `Com base no seu gosto · ${subLabel(topType || tastePicks[0].type, topSub)}`
          : topBrand
            ? `Você tem olhado ${topBrand}`
            : "Com base no que você viu",
        products: tastePicks,
      });
    }
  }

  // 3) Outras subcategorias do mesmo tipo (ex.: Árabes, Nicho… quando está em Grifes)
  if (seed?.type && seed.type in CATEGORIES) {
    const cat = CATEGORIES[seed.type as keyof typeof CATEGORIES];
    const currentSubs = new Set(
      seed.subcategories?.length
        ? seed.subcategories
        : seed.subcategory
          ? [seed.subcategory]
          : [],
    );
    for (const sub of cat.subcategories) {
      if (sections.length >= maxSections) break;
      if (currentSubs.has(sub.slug)) continue;
      const picks = pick(
        catalog,
        used,
        limitPerSection,
        (p) =>
          scoreProduct(p, {
            seed,
            taste,
            preferType: seed.type,
            preferSub: sub.slug,
          }),
        45,
      );
      if (picks.length < 3) continue;
      push({
        id: `sub-${seed.type}-${sub.slug}`,
        eyebrow: typeTitle(seed.type),
        title: sub.label,
        products: picks,
        href: `/categoria?tipo=${seed.type}&sub=${sub.slug}`,
      });
    }
  }

  // 4) Outras categorias (todas as complementares — sem parar na primeira)
  const fromType =
    seed?.type ||
    (contextType && contextType !== "lancamentos" ? contextType : "") ||
    topKeys(taste?.types ?? {}, 1)[0] ||
    "perfumes";

  const otherTypes = ALL_TYPES.filter((t) => t !== fromType && t !== contextType);
  const orderedOthers = [
    ...(COMPLEMENT[fromType] ?? []).filter((t) => otherTypes.includes(t as (typeof ALL_TYPES)[number])),
    ...otherTypes,
  ].filter((t, i, arr) => arr.indexOf(t) === i) as string[];

  for (const other of orderedOthers) {
    if (sections.length >= maxSections) break;
    const complementPicks = pick(
      catalog,
      used,
      limitPerSection,
      (p) => scoreProduct(p, { seed, taste, preferType: other }),
      15,
    );
    if (complementPicks.length < 2) continue;
    push({
      id: `complement-${other}`,
      eyebrow: "Outras categorias",
      title: complementTitle(other),
      products: complementPicks,
      href: `/categoria?tipo=${other}`,
    });
  }

  // 5) Fallback: lançamentos
  if (sections.length < 2) {
    const launches = pick(
      catalog,
      used,
      limitPerSection,
      (p) => (p.isLaunch ? 50 : p.featured ? 40 : 0) + scoreProduct(p, { seed, taste }),
      20,
    );
    if (launches.length) {
      push({
        id: "launches",
        eyebrow: "Novidades",
        title: "Lançamentos que valem a pena",
        products: launches,
        href: "/categoria?tipo=lancamentos",
      });
    }
  }

  if (sections.length === 0) {
    const fallback = pick(catalog, used, limitPerSection, (p) =>
      scoreProduct(p, { seed, taste, preferType: fromType }),
    );
    push({
      id: "explore",
      eyebrow: "Explore",
      title: `Outras opções em ${typeTitle(fromType)}`,
      products: fallback,
      href: `/categoria?tipo=${fromType}`,
    });
  }

  return sections;
}
