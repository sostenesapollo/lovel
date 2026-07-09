import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendInterpolatedEmail, isEmailConfigured } from "@/lib/email";
import { notifyOrderStatus } from "@/lib/ntfy";
import { verifyStripeWebhookSignature } from "@/lib/stripe";
import { formatPrice } from "@/lib/utils";

export const runtime = "nodejs";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
};

async function markOrderPaid(paymentId: string, orderIdFromMeta?: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderIdFromMeta ? [{ id: orderIdFromMeta }] : []),
        { paymentId },
      ],
    },
  });

  if (!order) return;

  if (order.status === "paid") {
    if (order.paymentId !== paymentId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentId },
      });
    }
    return;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "paid",
      paymentId,
    },
  });

  void notifyOrderStatus(updated, "paid");

  if (isEmailConfigured()) {
    const template = EMAIL_TEMPLATES.find((t) => t.id === "order_paid");
    const to = updated.userEmail;
    if (template && to) {
      const customer = updated.customer as { name?: string } | null;
      await sendInterpolatedEmail({
        to,
        template: template.id,
        subject: template.subject,
        bodyTemplate: template.body,
        vars: {
          name: customer?.name ?? "cliente",
          orderId: updated.id,
          total: formatPrice(updated.total),
        },
        userId: updated.userId ?? undefined,
      });
    }
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  const rawBody = await request.text();

  if (secret) {
    const ok = verifyStripeWebhookSignature(
      rawBody,
      request.headers.get("stripe-signature"),
      secret,
    );
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data?.object;
      const paymentId = pi?.id;
      if (paymentId) {
        await markOrderPaid(paymentId, pi?.metadata?.orderId);
      }
    }
  } catch (err) {
    console.error("[stripe/webhook]", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
