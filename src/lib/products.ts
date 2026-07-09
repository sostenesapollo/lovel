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

export function parseProduct(row: {
  id: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  subcategory: string;
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
}) {
  return {
    ...row,
    images: row.images as string[],
    notes: row.notes as Record<string, string> | undefined,
    badges: row.badges as Array<{ type: string; text: string }>,
    variants: row.variants as Array<{ label: string; price: number; sku: string; oldPrice?: number }>,
  };
}
