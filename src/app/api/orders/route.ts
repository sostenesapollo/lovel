import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  customer: z.record(z.string(), z.unknown()),
  items: z.array(z.record(z.string(), z.unknown())),
  payment: z.enum(["pix", "card"]),
  coupon: z.record(z.string(), z.unknown()).nullable().optional(),
  subtotal: z.number(),
  discount: z.number().default(0),
  shipping: z.number().default(0),
  total: z.number(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ success: false, message: "Dados inválidos." }, { status: 400 });
  }

  const orderId = `LVL-${Date.now()}`;
  const customer = body.data.customer as { email?: string };
  const order = await prisma.order.create({
    data: {
      id: orderId,
      userId: user?.id,
      userEmail: user?.email ?? customer.email,
      customer: body.data.customer as object,
      items: body.data.items as object[],
      payment: body.data.payment,
      coupon: (body.data.coupon as object) ?? undefined,
      subtotal: body.data.subtotal,
      discount: body.data.discount,
      shipping: body.data.shipping,
      total: body.data.total,
      status: "pending_payment",
    },
  });

  const pixCode =
    body.data.payment === "pix"
      ? `00020126580014BR.GOV.BCB.PIX0136lovel@pagamentos.com.br52040000530398654${String(Math.round(body.data.total * 100)).padStart(6, "0")}5802BR5925LOVEL PERFUMARIA LTDA6009SAO PAULO62070503***6304ABCD`
      : null;

  return NextResponse.json({
    success: true,
    orderId: order.id,
    pixCode,
    message: "Pedido criado com sucesso!",
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const orders =
    user.role === "ADMIN"
      ? await prisma.order.findMany({ orderBy: { createdAt: "desc" } })
      : await prisma.order.findMany({
          where: { OR: [{ userId: user.id }, { userEmail: user.email }] },
          orderBy: { createdAt: "desc" },
        });

  return NextResponse.json(orders);
}
