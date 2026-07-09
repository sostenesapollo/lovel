import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendInterpolatedEmail, isEmailConfigured } from "@/lib/email";
import { sendGa4PurchaseFromServer } from "@/lib/ga4-mp.server";
import { fetchPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { notifyOrderStatus } from "@/lib/ntfy";
import { formatPrice } from "@/lib/utils";

type WebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export async function POST(request: Request) {
  try {
    if (!isMercadoPagoConfigured()) {
      return NextResponse.json({ received: true });
    }

    const url = new URL(request.url);
    const queryId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    let body: WebhookBody = {};
    try {
      body = (await request.json()) as WebhookBody;
    } catch {
      body = {};
    }

    const paymentId = body.data?.id ?? queryId;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const payment = await fetchPayment(paymentId);
    if (payment.status !== "approved") {
      return NextResponse.json({ received: true });
    }

    const paymentIdStr = String(payment.id);
    const externalRef = payment.external_reference ?? undefined;

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(externalRef ? [{ id: externalRef }] : []),
          { paymentId: paymentIdStr },
        ],
      },
    });

    if (!order) {
      return NextResponse.json({ received: true });
    }

    const wasUnpaid = order.status !== "paid";
    if (wasUnpaid) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "paid",
          paymentId: paymentIdStr,
        },
      });

      void notifyOrderStatus(updated, "paid");

      const items = Array.isArray(updated.items)
        ? (updated.items as Array<Record<string, unknown>>).map((item) => ({
            item_id: String(item.productId ?? ""),
            item_name: String(item.name ?? "item"),
            price: Number(item.price ?? 0),
            quantity: Number(item.quantity ?? 1),
          }))
        : [];
      sendGa4PurchaseFromServer({
        transactionId: updated.id,
        value: updated.total,
        shipping: updated.shipping,
        items,
      });

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
  } catch (err) {
    console.error("[mercadopago/webhook]", err);
  }

  return NextResponse.json({ received: true });
}
