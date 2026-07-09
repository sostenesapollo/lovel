import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().optional(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ valid: false, message: "Cupom inválido." });
  }

  const coupon = await prisma.coupon.findFirst({
    where: { code: body.data.code.toUpperCase(), active: true },
  });

  if (!coupon) {
    return NextResponse.json({ valid: false, message: "Cupom inválido ou expirado." });
  }

  const orderTotal = body.data.orderTotal ?? 0;
  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return NextResponse.json({
      valid: false,
      message: `Pedido mínimo de R$ ${coupon.minOrder.toFixed(2)} para este cupom.`,
    });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      firstPurchaseOnly: coupon.firstPurchaseOnly,
      description: coupon.description,
    },
  });
}
