import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get("tipo");
  const sub = searchParams.get("sub");
  const launch = searchParams.get("launch");
  const featured = searchParams.get("featured");

  const [rows, storeConfig] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    getStoreConfig(),
  ]);

  let products = rows;

  if (tipo === "lancamentos") {
    products = products.filter((p) => p.isLaunch);
  } else if (tipo) {
    products = products.filter((p) => p.type === tipo);
  }
  if (sub) products = products.filter((p) => p.subcategory === sub);
  if (launch === "true") products = products.filter((p) => p.isLaunch);
  if (featured === "true") products = products.filter((p) => p.featured);

  return NextResponse.json(
    products.map((row) => applyStorefrontProduct(parseProduct(row), storeConfig)),
  );
}
