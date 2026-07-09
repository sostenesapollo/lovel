import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

function parseCategory(row: {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  showOnHome: boolean;
  sortOrder: number;
  variantLabels: unknown;
  subcategories: unknown;
}) {
  return {
    ...row,
    variantLabels: (row.variantLabels as string[]) ?? [],
    subcategories: (row.subcategories as Array<{ slug: string; label: string }>) ?? [],
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  const body = await request.json();

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(body.slug != null && {
        slug: String(body.slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      }),
      ...(body.title != null && { title: body.title }),
      ...(body.subtitle != null && { subtitle: body.subtitle }),
      ...(body.image != null && { image: body.image }),
      ...(body.showOnHome != null && { showOnHome: Boolean(body.showOnHome) }),
      ...(body.sortOrder != null && { sortOrder: Number(body.sortOrder) }),
      ...(body.variantLabels != null && { variantLabels: body.variantLabels }),
      ...(body.subcategories != null && { subcategories: body.subcategories }),
    },
  });

  return NextResponse.json({ success: true, category: parseCategory(category) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
