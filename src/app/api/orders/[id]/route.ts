import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Public order status for checkout polling / return page analytics.
 * Returns only fields needed to fire purchase after payment confirms.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.startsWith("LVL-")) {
    return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }

  const coupon = order.coupon as { code?: string } | null;

  return NextResponse.json({
    id: order.id,
    status: order.status,
    payment: order.payment,
    total: order.total,
    shipping: order.shipping,
    items: order.items,
    coupon: coupon?.code ?? null,
  });
}
