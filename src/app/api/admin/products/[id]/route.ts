import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { checkProductContentPolicy } from "@/lib/content-policy";
import { prisma } from "@/lib/db";
import { parseProduct, resolveSubcategoriesPayload } from "@/lib/products";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Produto não encontrado." }, { status: 404 });
  }

  const policyError = checkProductContentPolicy({
    name: body.name,
    brand: body.brand,
    description: body.description,
  });
  if (policyError) {
    return NextResponse.json({ message: policyError }, { status: 400 });
  }

  const images =
    body.images?.length ? body.images : body.image ? [body.image] : (existing.images as string[]);

  const hasSubUpdate = body.subcategories != null || body.subcategory != null;
  const subFields = hasSubUpdate ? resolveSubcategoriesPayload(body) : {};

  const { subcategory: _ignoreSub, subcategories: _ignoreSubs, ...rest } = body;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      id,
      images,
      ...subFields,
    },
  });

  return NextResponse.json({ success: true, product: parseProduct(product) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
