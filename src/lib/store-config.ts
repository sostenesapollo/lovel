import { prisma } from "@/lib/db";
import type { Product, ProductVariant } from "@/lib/types";

const STORE_CONFIG_KEY = "store_config";

export type StoreConfig = {
  /** Só a variante mais cara na loja; esconde fracionados e o label de categoria no produto. */
  maxPriceOnly: boolean;
};

const DEFAULT_STORE_CONFIG: StoreConfig = {
  maxPriceOnly: false,
};

export async function getStoreConfig(): Promise<StoreConfig> {
  const row = await prisma.setting.findUnique({ where: { key: STORE_CONFIG_KEY } });
  const value = row?.value as Partial<StoreConfig> | null;
  return {
    maxPriceOnly: Boolean(value?.maxPriceOnly),
  };
}

export async function saveStoreConfig(config: StoreConfig): Promise<StoreConfig> {
  const next: StoreConfig = {
    maxPriceOnly: Boolean(config.maxPriceOnly),
  };
  await prisma.setting.upsert({
    where: { key: STORE_CONFIG_KEY },
    create: { key: STORE_CONFIG_KEY, value: next },
    update: { value: next },
  });
  return next;
}

export function maxPriceVariantIndex(variants: ProductVariant[]): number {
  if (!variants?.length) return 0;
  let maxIdx = 0;
  let maxPrice = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < variants.length; i++) {
    const price = Number(variants[i]?.price);
    if (!Number.isFinite(price)) continue;
    if (price > maxPrice) {
      maxPrice = price;
      maxIdx = i;
    }
  }
  return maxIdx;
}

/** Aplica regras da loja na resposta pública (não usar no admin). */
export function applyStorefrontProduct<T extends Product>(product: T, config: StoreConfig): T {
  if (!config.maxPriceOnly) return product;

  const variants = product.variants?.length ? product.variants : [];
  if (!variants.length) {
    return { ...product, category: "" };
  }

  const idx = maxPriceVariantIndex(variants);
  return {
    ...product,
    variants: [variants[idx]],
    defaultVariant: 0,
    category: "",
  };
}

export { DEFAULT_STORE_CONFIG };
