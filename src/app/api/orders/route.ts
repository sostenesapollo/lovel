import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPixPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { notifyNewOrder } from "@/lib/ntfy";

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
  const customer = body.data.customer as { email?: string; name?: string };
  const email = user?.email ?? customer.email ?? "";

  let paymentId: string | undefined;
  let pixCode: string | null = null;
  let pixQrCodeBase64: string | null = null;

  if (body.data.payment === "pix" && isMercadoPagoConfigured() && email) {
    try {
      const pix = await createPixPayment({
        orderId,
        amount: body.data.total,
        email,
        description: `Pedido LOVEL ${orderId}`,
      });
      paymentId = pix.paymentId;
      pixCode = pix.qrCode || null;
      pixQrCodeBase64 = pix.qrCodeBase64 || null;
    } catch (err) {
      console.error("[orders] Mercado Pago PIX failed:", err);
      return NextResponse.json(
        { success: false, message: "Falha ao gerar PIX. Tente novamente." },
        { status: 502 },
      );
    }
  } else if (body.data.payment === "pix") {
    pixCode = `00020126580014BR.GOV.BCB.PIX0136lovel@pagamentos.com.br52040000530398654${String(Math.round(body.data.total * 100)).padStart(6, "0")}5802BR5925LOVEL PERFUMARIA LTDA6009SAO PAULO62070503***6304ABCD`;
  }

  const order = await prisma.order.create({
    data: {
      id: orderId,
      userId: user?.id,
      userEmail: email || null,
      customer: body.data.customer as object,
      items: body.data.items as object[],
      payment: body.data.payment,
      paymentId,
      pixQrCode: pixCode,
      pixQrCodeBase64,
      coupon: (body.data.coupon as object) ?? undefined,
      subtotal: body.data.subtotal,
      discount: body.data.discount,
      shipping: body.data.shipping,
      total: body.data.total,
      status: "pending_payment",
    },
  });

  void sendOrderStatusEmail(order, "pending_payment");
  void notifyNewOrder(order);

  return NextResponse.json({
    success: true,
    orderId: order.id,
    pixCode,
    pixQrCodeBase64,
    paymentId,
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
