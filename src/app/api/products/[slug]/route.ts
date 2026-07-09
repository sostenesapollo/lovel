import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json(parseProduct(product));
}
