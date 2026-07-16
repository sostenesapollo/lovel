import { prisma } from "@/lib/db";

/** Contagem de unidades vendidas em pedidos pagos/enviados/entregues. */
export async function getPaidOrderCounts(): Promise<Map<string, number>> {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["paid", "shipped", "delivered"] } },
    select: { items: true },
  });

  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!Array.isArray(order.items)) continue;
    for (const raw of order.items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as { productId?: unknown; quantity?: unknown };
      const productId = typeof item.productId === "string" ? item.productId : "";
      if (!productId) continue;
      const qty = Number(item.quantity);
      counts.set(productId, (counts.get(productId) ?? 0) + (Number.isFinite(qty) && qty > 0 ? qty : 1));
    }
  }
  return counts;
}

export async function countPaidOrders(): Promise<number> {
  return prisma.order.count({
    where: { status: { in: ["paid", "shipped", "delivered"] } },
  });
}
