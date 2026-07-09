import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const schema = z.object({ status: z.string() });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ message: "Status inválido." }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: body.data.status as "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled" },
  });

  return NextResponse.json({ success: true, order });
}
