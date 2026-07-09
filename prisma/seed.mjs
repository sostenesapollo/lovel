import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const dataDir = join(__dirname, "..", "data");

function loadJson(file) {
  return JSON.parse(readFileSync(join(dataDir, file), "utf8"));
}

async function main() {
  const products = loadJson("products.json");
  const coupons = loadJson("coupons.json");
  const users = loadJson("users.json");
  const promotions = loadJson("promotions.json");

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: String(p.id) },
      create: {
        id: String(p.id),
        slug: String(p.slug),
        brand: String(p.brand),
        name: String(p.name),
        type: String(p.type),
        subcategory: String(p.subcategory),
        category: String(p.category),
        image: String(p.image),
        images: p.images ?? [String(p.image)],
        description: String(p.description),
        notes: p.notes ?? null,
        badges: p.badges ?? [],
        variants: p.variants ?? [],
        defaultVariant: Number(p.defaultVariant ?? 0),
        featured: Boolean(p.featured),
        isLaunch: Boolean(p.isLaunch),
        soldOut: Boolean(p.soldOut),
      },
      update: {
        slug: String(p.slug),
        brand: String(p.brand),
        name: String(p.name),
        image: String(p.image),
        images: p.images ?? [String(p.image)],
        description: String(p.description),
        variants: p.variants ?? [],
        featured: Boolean(p.featured),
        isLaunch: Boolean(p.isLaunch),
        soldOut: Boolean(p.soldOut),
      },
    });
  }

  for (const c of coupons) {
    const code = String(c.code).toUpperCase();
    await prisma.coupon.upsert({
      where: { code },
      create: {
        code,
        type: String(c.type),
        value: Number(c.value),
        minOrder: Number(c.minOrder ?? 0),
        firstPurchaseOnly: Boolean(c.firstPurchaseOnly),
        description: c.description ? String(c.description) : null,
      },
      update: {
        type: String(c.type),
        value: Number(c.value),
        minOrder: Number(c.minOrder ?? 0),
        firstPurchaseOnly: Boolean(c.firstPurchaseOnly),
        description: c.description ? String(c.description) : null,
      },
    });
  }

  for (const u of users) {
    const role = u.role === "admin" ? "ADMIN" : "CUSTOMER";
    const passwordHash = await bcrypt.hash(u.password, 12);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { name: u.name, role, passwordHash },
      });
    } else {
      await prisma.user.create({
        data: { email: u.email, name: u.name, role, passwordHash },
      });
    }
  }

  await prisma.setting.upsert({
    where: { key: "promotions" },
    create: { key: "promotions", value: promotions },
    update: { value: promotions },
  });

  console.log(`Seed OK: ${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
