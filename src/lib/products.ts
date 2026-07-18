import { prisma } from "@/lib/db";

const PROMOTIONS_KEY = "promotions";

export async function getPromotions() {
  const row = await prisma.setting.findUnique({ where: { key: PROMOTIONS_KEY } });
  if (row?.value) return row.value as Record<string, unknown>;

  return {
    freeShippingThreshold: 199,
    pixDiscountPercent: 5,
    banners: [
      { highlight: "Frete Grátis", text: "acima de R$199" },
      { highlight: "5% OFF", text: "no PIX" },
      { highlight: "Cupom", text: "PRIMEIRACOMPRA na 1ª compra", code: "PRIMEIRACOMPRA" },
    ],
  };
}

export async function savePromotions(value: Record<string, unknown>) {
  await prisma.setting.upsert({
    where: { key: PROMOTIONS_KEY },
    create: { key: PROMOTIONS_KEY, value: value as object },
    update: { value: value as object },
  });
}

/** Normaliza legado (string) e array JSON para string[]. */
export function normalizeSubcategories(input: {
  subcategory?: string | null;
  subcategories?: unknown;
}): string[] {
  const fromArray = Array.isArray(input.subcategories)
    ? input.subcategories.map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  if (fromArray.length) {
    return [...new Set(fromArray)];
  }
  const single = (input.subcategory ?? "").trim();
  return single ? [single] : [];
}

/** Exact match or child slugs (nicho → nicho-masculino). */
export function productMatchesSub(subcategories: string[], sub: string): boolean {
  return subcategories.some((s) => s === sub || s.startsWith(`${sub}-`));
}

/** Payload Prisma a partir de body admin (aceita subcategory string ou subcategories[]). */
export function resolveSubcategoriesPayload(body: {
  subcategory?: unknown;
  subcategories?: unknown;
}): { subcategory: string; subcategories: string[] } {
  let list: string[] = [];
  if (Array.isArray(body.subcategories)) {
    list = body.subcategories.map(String).map((s) => s.trim()).filter(Boolean);
  } else if (typeof body.subcategory === "string" && body.subcategory.trim()) {
    list = body.subcategory
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  list = [...new Set(list)];
  return { subcategory: list[0] ?? "", subcategories: list };
}

export function parseProduct(row: {
  id: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  subcategory: string;
  subcategories?: unknown;
  category: string;
  image: string;
  images: unknown;
  description: string;
  notes: unknown;
  badges: unknown;
  variants: unknown;
  defaultVariant: number;
  featured: boolean;
  isLaunch: boolean;
  soldOut: boolean;
  active: boolean;
  promoText?: string | null;
  deletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}) {
  const subcategories = normalizeSubcategories(row);
  return {
    ...row,
    subcategory: subcategories[0] ?? row.subcategory ?? "",
    subcategories,
    active: row.active !== false,
    promoText: row.promoText ?? null,
    deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    images: row.images as string[],
    notes: row.notes as Record<string, string> | undefined,
    badges: row.badges as Array<{ type: string; text: string }>,
    variants: row.variants as Array<{ label: string; price: number; sku: string; oldPrice?: number }>,
  };
}
