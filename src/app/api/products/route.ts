import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get("tipo");
  const sub = searchParams.get("sub");
  const launch = searchParams.get("launch");
  const featured = searchParams.get("featured");

  let products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  if (tipo === "lancamentos") {
    products = products.filter((p) => p.isLaunch);
  } else if (tipo) {
    products = products.filter((p) => p.type === tipo);
  }
  if (sub) products = products.filter((p) => p.subcategory === sub);
  if (launch === "true") products = products.filter((p) => p.isLaunch);
  if (featured === "true") products = products.filter((p) => p.featured);

  return NextResponse.json(products.map(parseProduct));
}
