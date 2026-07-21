import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const body = await request.json();
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (!ids.length) {
    return NextResponse.json({ message: "Nenhum produto selecionado." }, { status: 400 });
  }

  const permanent = body.action === "purge" || body.permanent === true;

  if (permanent) {
    const result = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, count: result.count, permanent: true });
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date(), active: false },
  });

  return NextResponse.json({ success: true, count: result.count, permanent: false });
}
