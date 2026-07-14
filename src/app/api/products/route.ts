import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeSubcategories, parseProduct, productMatchesSub } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const where = buildWhere(searchParams);
  const sub = searchParams.get("sub");
  const paginate = searchParams.has("page") || searchParams.has("limit");

  const storeConfigPromise = getStoreConfig();

  const [rows, storeConfig] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    storeConfigPromise,
  ]);

  const matched = sub
    ? rows.filter((row) => productMatchesSub(normalizeSubcategories(row), sub))
    : rows;

  const mapped = matched.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig));

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
