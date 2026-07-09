import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { parseProduct } from "@/lib/products";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(products.map(parseProduct));
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();

  if (!body.name || !body.brand || !body.type) {
    return NextResponse.json({ message: "Nome, marca e tipo são obrigatórios." }, { status: 400 });
  }

  const id = body.id || `${String(body.type)[0]}${Date.now()}`;
  const slug =
    body.slug ||
    `${body.brand}-${body.name}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const product = await prisma.product.create({
    data: {
      id,
      slug,
      brand: body.brand,
      name: body.name,
      type: body.type,
      subcategory: body.subcategory ?? "",
      category: body.category ?? body.type,
      image: body.image ?? "",
      images: body.images?.length ? body.images : body.image ? [body.image] : [],
      description: body.description ?? "",
      notes: body.notes ?? null,
      badges: body.badges ?? [],
      variants: body.variants ?? [{ label: "Único", price: 0, sku: `${id}-1` }],
      defaultVariant: body.defaultVariant ?? 0,
      featured: Boolean(body.featured),
      isLaunch: Boolean(body.isLaunch),
      soldOut: Boolean(body.soldOut),
      active: body.active !== false,
      promoText: body.promoText ?? null,
    },
  });

  return NextResponse.json({ success: true, product: parseProduct(product) });
}
