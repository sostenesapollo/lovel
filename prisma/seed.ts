import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const dataDir = join(__dirname, "..", "data");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), "utf8"));
}

const DEFAULT_CATEGORIES = [
  {
    slug: "perfumes",
    title: "Perfumes",
    subtitle: "Decants & Frascos Inteiros",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=500&fit=crop",
    showOnHome: true,
    sortOrder: 0,
    variantLabels: ["4ml", "10ml", "100ml", "Frasco Inteiro"],
    subcategories: [
      { slug: "arabes", label: "Árabes" },
      { slug: "grifes", label: "Grifes" },
      { slug: "nicho-masculino", label: "Nicho Masculino" },
      { slug: "nicho-feminino", label: "Nicho Feminino" },
    ],
  },
  {
    slug: "cabelos",
    title: "Cabelos",
    subtitle: "Fracionados & Inteiros",
    image: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&h=500&fit=crop",
    showOnHome: true,
    sortOrder: 1,
    variantLabels: ["30g", "50g", "100ml", "Frasco Inteiro"],
    subcategories: [
      { slug: "tratamento", label: "Tratamento" },
      { slug: "mascaras", label: "Máscaras" },
      { slug: "oleos", label: "Óleos" },
      { slug: "shampoos", label: "Shampoos" },
      { slug: "condicionadores", label: "Condicionadores" },
    ],
  },
  {
    slug: "skincare",
    title: "Skincare",
    subtitle: "Rotina Facial Importada",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=500&fit=crop",
    showOnHome: true,
    sortOrder: 2,
    variantLabels: ["15ml", "30ml", "50ml", "Frasco Inteiro"],
    subcategories: [
      { slug: "serum", label: "Séruns" },
      { slug: "protetor", label: "Protetores" },
      { slug: "hidratante", label: "Hidratantes" },
      { slug: "limpeza", label: "Limpeza" },
    ],
  },
];

async function main() {
  const products = loadJson<Array<Record<string, unknown>>>("products.json");
  const coupons = loadJson<Array<Record<string, unknown>>>("coupons.json");
  const users = loadJson<Array<{ id: string; email: string; password: string; name: string; role: string }>>("users.json");
  const promotions = loadJson<Record<string, unknown>>("promotions.json");

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        title: cat.title,
        subtitle: cat.subtitle,
        image: cat.image,
        showOnHome: cat.showOnHome,
        sortOrder: cat.sortOrder,
        variantLabels: cat.variantLabels,
        subcategories: cat.subcategories,
      },
      update: {
        // Categorias editadas no admin não devem ser resetadas pelo seed
      },
    });
  }

  for (const p of products) {
    const subList = Array.isArray(p.subcategories)
      ? (p.subcategories as string[]).map(String).filter(Boolean)
      : p.subcategory
        ? [String(p.subcategory)]
        : [];
    const subcategory = subList[0] ?? "";

    await prisma.product.upsert({
      where: { id: String(p.id) },
      create: {
        id: String(p.id),
        slug: String(p.slug),
        brand: String(p.brand),
        name: String(p.name),
        type: String(p.type),
        subcategory,
        subcategories: subList,
        category: String(p.category),
        image: String(p.image),
        images: (p.images as string[]) ?? [String(p.image)],
        description: String(p.description),
        notes: (p.notes as object) ?? undefined,
        badges: (p.badges as object[]) ?? [],
        variants: (p.variants as object[]) ?? [],
        defaultVariant: Number(p.defaultVariant ?? 0),
        featured: Boolean(p.featured),
        isLaunch: Boolean(p.isLaunch),
        soldOut: Boolean(p.soldOut),
      },
      update: {
        // Não sobrescrever produtos existentes em seed repetido — evita apagar fotos/preços reais
      },
    });
  }

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: String(c.code).toUpperCase() },
      create: {
        code: String(c.code).toUpperCase(),
        type: String(c.type),
        value: Number(c.value),
        minOrder: Number(c.minOrder ?? 0),
        firstPurchaseOnly: Boolean(c.firstPurchaseOnly),
        description: c.description ? String(c.description) : null,
        active: c.active !== false,
      },
      update: {
        // Cupons editados no admin não devem ser resetados pelo seed
      },
    });
  }

  for (const u of users) {
    const role = u.role === "admin" ? "ADMIN" : "CUSTOMER";
    const passwordHash = await bcrypt.hash(u.password, 12);
    const email = u.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Não resetar senha/nome de usuários já existentes
      continue;
    }
    await prisma.user.create({
      data: {
        email,
        name: u.name,
        role,
        passwordHash,
        passwordSetAt: new Date(),
      },
    });
  }

  const promoExisting = await prisma.setting.findUnique({ where: { key: "promotions" } });
  if (!promoExisting) {
    await prisma.setting.create({
      data: { key: "promotions", value: promotions as object },
    });
  }

  console.log(
    `Seed OK: ${DEFAULT_CATEGORIES.length} categories, ${products.length} products, ${coupons.length} coupons, ${users.length} users`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
