import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getPaidOrderCounts } from "@/lib/product-popularity";
import { normalizeSubcategories, parseProduct, productMatchesSub } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";
import type { Product } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

const SORT_OPTIONS = new Set(["name", "price_asc", "price_desc", "popular"]);

function buildWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const tipo = searchParams.get("tipo");
  const launch = searchParams.get("launch");
  const featured = searchParams.get("featured");
  const idsParam = searchParams.get("ids");
  const q = (searchParams.get("q") ?? searchParams.get("search") ?? "").trim();

  const where: Prisma.ProductWhereInput = { active: true };
  const and: Prisma.ProductWhereInput[] = [];

  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length) where.id = { in: ids };
  }

  if (tipo === "lancamentos" || launch === "true") {
    where.isLaunch = true;
  } else if (tipo) {
    where.type = tipo;
  }
  if (featured === "true") where.featured = true;

  // subcategory filter applied in memory (multi-sub + SQLite JSON)
  if (q) {
    and.push({
      OR: [{ name: { contains: q } }, { brand: { contains: q } }],
    });
  }

  if (and.length) where.AND = and;

  return where;
}

function productMinPrice(product: Product): number {
  const prices = product.variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

function sortProducts(
  products: Product[],
  sort: string,
  orderCounts: Map<string, number>,
): Product[] {
  const sorted = [...products];

  if (sort === "price_asc") {
    sorted.sort((a, b) => productMinPrice(a) - productMinPrice(b) || a.name.localeCompare(b.name));
  } else if (sort === "price_desc") {
    sorted.sort((a, b) => productMinPrice(b) - productMinPrice(a) || a.name.localeCompare(b.name));
  } else if (sort === "popular") {
    sorted.sort((a, b) => {
      const diff = (orderCounts.get(b.id) ?? 0) - (orderCounts.get(a.id) ?? 0);
      return diff || a.name.localeCompare(b.name);
    });
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  return sorted;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const where = buildWhere(searchParams);
  const sub = searchParams.get("sub");
  const paginate = searchParams.has("page") || searchParams.has("limit");
  const sortParam = (searchParams.get("sort") ?? "name").trim();
  const sort = SORT_OPTIONS.has(sortParam) ? sortParam : "name";

  const [rows, storeConfig, orderCounts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    getStoreConfig(),
    sort === "popular" ? getPaidOrderCounts() : Promise.resolve(new Map<string, number>()),
  ]);

  const matched = sub
    ? rows.filter((row) => productMatchesSub(normalizeSubcategories(row), sub))
    : rows;

  const mapped = sortProducts(
    matched.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig)),
    sort,
    orderCounts,
  );

  if (!paginate) {
    return NextResponse.json(mapped);
  }

  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const skip = (page - 1) * pageSize;
  const items = mapped.slice(skip, skip + pageSize);
  const total = mapped.length;
  const hasMore = skip + items.length < total;

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    hasMore,
  });
}
