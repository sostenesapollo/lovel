import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(
    categories.map((c) => ({
      ...c,
      variantLabels: (c.variantLabels as string[]) ?? [],
      subcategories: (c.subcategories as Array<{ slug: string; label: string }>) ?? [],
    })),
  );
}
