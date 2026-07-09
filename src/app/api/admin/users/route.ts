import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { toSafeUser } from "@/lib/auth";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, emailLogs: true } },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      ...toSafeUser(u),
      ordersCount: u._count.orders,
      emailsCount: u._count.emailLogs,
      createdAt: u.createdAt,
    })),
  );
}
