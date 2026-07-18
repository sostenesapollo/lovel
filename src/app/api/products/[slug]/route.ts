import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";
import { applyStorefrontProduct, getStoreConfig } from "@/lib/store-config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [product, storeConfig] = await Promise.all([
    prisma.product.findFirst({
      where: { active: true, deletedAt: null, OR: [{ slug }, { id: slug }] },
    }),
    getStoreConfig(),
  ]);
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json(applyStorefrontProduct(parseProduct(product), storeConfig));
}
