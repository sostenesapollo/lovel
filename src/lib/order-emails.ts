import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/constants";
import {
  isEmailConfigured,
  sendInterpolatedEmail,
  type EmailAttachment,
} from "@/lib/email";
import { formatPrice } from "@/lib/utils";

type OrderLike = {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  total: number;
  payment?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPixBlock(order: OrderLike) {
  if (order.payment !== "pix" || !order.pixQrCode) return "";

  const code = escapeHtml(order.pixQrCode);
  const hasQr = Boolean(order.pixQrCodeBase64);

  return [
    `<div style="margin:16px 0;padding:16px;border:1px solid #e8e4df;background:#faf8f5;">`,
    `<p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0a0a0a;">Pague com PIX</p>`,
    hasQr
      ? `<div style="text-align:center;margin:0 0 12px;"><img src="cid:pix-qr" alt="QR Code PIX" width="220" height="220" style="display:inline-block;width:220px;height:220px;border:0;" /></div>`
      : "",
    `<p style="margin:0 0 6px;font-size:13px;color:#1a1a1a;">PIX copia e cola:</p>`,
    `<p style="margin:0;padding:10px;background:#fff;border:1px solid #e8e4df;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.45;word-break:break-all;color:#0a0a0a;">${code}</p>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

function buildAccountBlock(accountUrl: string | undefined) {
  if (!accountUrl) return "";

  const isSetPassword = accountUrl.includes("/conta/senha");
  return [
    `<div style="margin:16px 0;text-align:center;">`,
    `<p style="margin:0 0 12px;line-height:1.6;color:#1a1a1a;">${
      isSetPassword
        ? "Para ver seus pedidos, acesse sua conta e defina sua senha:"
        : "Acompanhe seus pedidos na sua conta:"
    }</p>`,
    `<a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 22px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Acesse aqui a sua conta</a>`,
    `</div>`,
  ].join("");
}

function pixAttachment(order: OrderLike): EmailAttachment[] {
  const raw = order.pixQrCodeBase64;
  if (!raw) return [];

  const base64 = raw.startsWith("data:") ? raw.split(",")[1] ?? "" : raw;
  if (!base64) return [];

  return [
    {
      filename: "pix-qr.png",
      content: Buffer.from(base64, "base64"),
      contentId: "pix-qr",
      contentType: "image/png",
    },
  ];
}

async function sendTemplateSafe(
  templateId: EmailTemplateId,
  to: string,
  vars: Record<string, string>,
  userId?: string,
  attachments?: EmailAttachment[],
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
      attachments,
    });
  } catch (err) {
    console.error(`[order-emails] failed to send ${templateId}:`, err);
  }
}

export async function sendOrderStatusEmail(
  order: OrderLike,
  status: string,
  options?: { accountUrl?: string },
) {
  const templateId = STATUS_TEMPLATE[status];
  if (!templateId) return;

  const to = order.userEmail;
  if (!to) return;

  const isPending = status === "pending_payment";
  const vars: Record<string, string> = {
    name: customerName(order),
    orderId: order.id,
    total: formatPrice(order.total),
    pixBlock: isPending ? buildPixBlock(order) : "",
    accountBlock: isPending ? buildAccountBlock(options?.accountUrl) : "",
  };

  await sendTemplateSafe(
    templateId,
    to,
    vars,
    order.userId ?? undefined,
    isPending ? pixAttachment(order) : undefined,
  );
}

export async function sendWelcomeEmail(user: UserLike) {
  await sendTemplateSafe("welcome", user.email, { name: user.name }, user.id);
}

export async function sendLoginAlertEmail(user: UserLike) {
  await sendTemplateSafe("login_alert", user.email, { name: user.name }, user.id);
}
