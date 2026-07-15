import type { Product } from "@/lib/types";

export type TasteView = {
  id: string;
  slug: string;
  type: string;
  subcategory: string;
  brand: string;
  at: number;
};

export type TasteProfile = {
  views: TasteView[];
  types: Record<string, number>;
  subs: Record<string, number>;
  brands: Record<string, number>;
};

const STORAGE_KEY = "lovel:browsing-taste";
const MAX_VIEWS = 40;

function emptyProfile(): TasteProfile {
  return { views: [], types: {}, subs: {}, brands: {} };
}

function rebuildAggregates(views: TasteView[]): TasteProfile {
  const types: Record<string, number> = {};
  const subs: Record<string, number> = {};
  const brands: Record<string, number> = {};
  for (const v of views) {
    if (v.type) types[v.type] = (types[v.type] ?? 0) + 1;
    if (v.subcategory) subs[v.subcategory] = (subs[v.subcategory] ?? 0) + 1;
    if (v.brand) brands[v.brand.toLowerCase()] = (brands[v.brand.toLowerCase()] ?? 0) + 1;
  }
  return { views, types, subs, brands };
}

export function readTasteProfile(): TasteProfile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as { views?: TasteView[] };
    const views = Array.isArray(parsed.views) ? parsed.views.slice(0, MAX_VIEWS) : [];
    return rebuildAggregates(views);
  } catch {
    return emptyProfile();
  }
}

export function recordProductView(product: Product): TasteProfile {
  if (typeof window === "undefined") return emptyProfile();
  const prev = readTasteProfile();
  const nextView: TasteView = {
    id: product.id,
    slug: product.slug,
    type: product.type || "",
    subcategory: product.subcategory || product.subcategories?.[0] || "",
    brand: product.brand || "",
    at: Date.now(),
  };
  const views = [nextView, ...prev.views.filter((v) => v.id !== product.id)].slice(0, MAX_VIEWS);
  const profile = rebuildAggregates(views);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ views: profile.views }));
  } catch {
    // quota / private mode
  }
  return profile;
}

export function topKeys(map: Record<string, number>, limit = 3): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
