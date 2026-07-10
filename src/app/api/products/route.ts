import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function buildWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const tipo = searchParams.get("tipo");
  const sub = searchParams.get("sub");
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

  // Exact match or child slugs (e.g. nicho → nicho-masculino / nicho-feminino)
  if (sub) {
    and.push({
      OR: [{ subcategory: sub }, { subcategory: { startsWith: `${sub}-` } }],
    });
  }

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
  const paginate = searchParams.has("page") || searchParams.has("limit");

  const storeConfigPromise = getStoreConfig();

  if (!paginate) {
    const [rows, storeConfig] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      storeConfigPromise,
    ]);
    return NextResponse.json(
      rows.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig)),
    );
  }

  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const skip = (page - 1) * pageSize;

  const [total, rows, storeConfig] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
    }),
    storeConfigPromise,
  ]);

  const items = rows.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig));
  const hasMore = skip + items.length < total;

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    hasMore,
  });
}
