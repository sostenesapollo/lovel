import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const [orders, products, users, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.aggregate({ _sum: { total: true } }),
  ]);

  return NextResponse.json({
    orders,
    products,
    users,
    revenue: revenue._sum.total ?? 0,
  });
}
