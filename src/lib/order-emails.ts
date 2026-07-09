import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/constants";
import { isEmailConfigured, sendInterpolatedEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils";

type OrderLike = {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  total: number;
  customer?: unknown;
  status?: string;
};

type UserLike = {
  id: string;
  email: string;
  name: string;
};

const STATUS_TEMPLATE: Record<string, EmailTemplateId> = {
  pending_payment: "order_pending",
  paid: "order_paid",
  shipped: "order_shipped",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
};

function customerName(order: OrderLike) {
  const customer = order.customer as { name?: string } | null | undefined;
  return customer?.name ?? "cliente";
}

async function sendTemplateSafe(
  templateId: EmailTemplateId,
  to: string,
  vars: Record<string, string>,
  userId?: string,
) {
  if (!isEmailConfigured()) return;

  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return;

  try {
    await sendInterpolatedEmail({
      to,
      template: template.id,
      subject: template.subject,
      bodyTemplate: template.body,
      vars,
      userId,
    });
  } catch (err) {
    console.error(`[order-emails] failed to send ${templateId}:`, err);
  }
}

export async function sendOrderStatusEmail(order: OrderLike, status: string) {
  const templateId = STATUS_TEMPLATE[status];
  if (!templateId) return;

  const to = order.userEmail;
  if (!to) return;

  await sendTemplateSafe(
    templateId,
    to,
    {
      name: customerName(order),
      orderId: order.id,
      total: formatPrice(order.total),
    },
    order.userId ?? undefined,
  );
}

export async function sendWelcomeEmail(user: UserLike) {
  await sendTemplateSafe("welcome", user.email, { name: user.name }, user.id);
}

export async function sendLoginAlertEmail(user: UserLike) {
  await sendTemplateSafe("login_alert", user.email, { name: user.name }, user.id);
}
