import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createCardCheckoutPreference,
  createPixPayment,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { createStripePixPayment, isStripeConfigured } from "@/lib/stripe";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { notifyNewOrder } from "@/lib/ntfy";
import { ensureCustomerFromOrder } from "@/lib/password-reset";
import { pixQrCodeBase64FromPayload } from "@/lib/pix-qr";

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
  let checkoutUrl: string | null = null;

  if (body.data.payment === "pix" && email) {
    const description = `Pedido LOVEL ${orderId}`;

    if (isMercadoPagoConfigured()) {
      try {
        const pix = await createPixPayment({
          orderId,
          amount: body.data.total,
          email,
          description,
        });
        paymentId = pix.paymentId;
        pixCode = pix.qrCode || null;
        pixQrCodeBase64 = pix.qrCodeBase64 || null;
      } catch (err) {
        console.error("[orders] Mercado Pago PIX failed, trying Stripe:", err);
      }
    }

    if (!pixCode && isStripeConfigured()) {
      try {
        const pix = await createStripePixPayment({
          orderId,
          amount: body.data.total,
          email,
          description,
        });
        paymentId = pix.paymentId;
        pixCode = pix.qrCode || null;
        pixQrCodeBase64 = pix.qrCodeBase64 || null;
      } catch (err) {
        console.error("[orders] Stripe PIX failed:", err);
        return NextResponse.json(
          { success: false, message: "Falha ao gerar PIX. Tente novamente." },
          { status: 502 },
        );
      }
    }

    if (!pixCode) {
      return NextResponse.json(
        { success: false, message: "Pagamento PIX não configurado." },
        { status: 503 },
      );
    }
  } else if (body.data.payment === "card") {
    if (!isMercadoPagoConfigured() || !email) {
      return NextResponse.json(
        { success: false, message: "Pagamento com cartão indisponível no momento." },
        { status: 503 },
      );
    }
    try {
      const preference = await createCardCheckoutPreference({
        orderId,
        amount: body.data.total,
        email,
        name: customer.name,
        description: `Pedido LOVEL ${orderId}`,
      });
      paymentId = preference.preferenceId;
      checkoutUrl = preference.initPoint;
    } catch (err) {
      console.error("[orders] Mercado Pago card preference failed:", err);
      return NextResponse.json(
        { success: false, message: "Falha ao abrir o checkout do cartão. Tente novamente." },
        { status: 502 },
      );
    }
  }

  if (pixCode && !pixQrCodeBase64) {
    try {
      pixQrCodeBase64 = await pixQrCodeBase64FromPayload(pixCode);
    } catch (err) {
      console.error("[orders] Failed to generate PIX QR image:", err);
    }
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

  void (async () => {
    let accountUrl: string | undefined;
    let userId = order.userId;

    if (!user && email) {
      try {
        const ensured = await ensureCustomerFromOrder({
          email,
          name: customer.name,
          orderId: order.id,
        });
        accountUrl = ensured?.accountUrl ?? undefined;
        userId = ensured?.user.id ?? userId;
      } catch (err) {
        console.error("[orders] ensureCustomerFromOrder:", err);
      }
    }

    await sendOrderStatusEmail(
      { ...order, userId },
      "pending_payment",
      accountUrl ? { accountUrl } : undefined,
    );
  })().catch((err) => console.error("[orders] post-create emails:", err));

  void notifyNewOrder(order);

  return NextResponse.json({
    success: true,
    orderId: order.id,
    pixCode,
    pixQrCodeBase64,
    paymentId,
    checkoutUrl,
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
