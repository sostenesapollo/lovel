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

export async function GET(request: Request) {
  const isAdmin = isAdminAuthorized(request);
  const categories = await prisma.category.findMany({
    where: isAdmin ? undefined : { showOnHome: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories.map(parseCategory));
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();
  if (!body.slug || !body.title) {
    return NextResponse.json({ message: "Slug e título são obrigatórios." }, { status: 400 });
  }

  const slug = String(body.slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const category = await prisma.category.create({
    data: {
      slug,
      title: body.title,
      subtitle: body.subtitle ?? "",
      image: body.image ?? "",
      showOnHome: body.showOnHome !== false,
      sortOrder: Number(body.sortOrder ?? 0),
      variantLabels: body.variantLabels ?? [],
      subcategories: body.subcategories ?? [],
    },
  });

  return NextResponse.json({ success: true, category: parseCategory(category) });
}
