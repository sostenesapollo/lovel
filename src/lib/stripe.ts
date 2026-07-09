import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurado");
  return key;
}

type PixPaymentResult = {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  status: string;
};

type StripePaymentIntent = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  next_action?: {
    type?: string;
    pix_display_qr_code?: {
      data?: string;
      image_url_png?: string;
      image_url_svg?: string;
      hosted_instructions_url?: string;
      expires_at?: number;
    };
  };
};

async function stripeForm<T>(
  path: string,
  body: URLSearchParams,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Stripe ${path} failed (${res.status}): ${errBody}`);
  }

  return (await res.json()) as T;
}

async function pngUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Stripe PIX QR PNG (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

/** Cria PaymentIntent PIX confirmado e devolve copia-e-cola + QR. */
export async function createStripePixPayment(input: {
  orderId: string;
  amount: number;
  email: string;
  description: string;
}): Promise<PixPaymentResult> {
  const amountCents = Math.round(input.amount * 100);
  if (amountCents < 1) throw new Error("Valor PIX inválido");

  const body = new URLSearchParams();
  body.set("amount", String(amountCents));
  body.set("currency", "brl");
  body.set("confirm", "true");
  body.set("payment_method_types[0]", "pix");
  body.set("payment_method_data[type]", "pix");
  body.set("description", input.description.slice(0, 1000));
  body.set("receipt_email", input.email);
  body.set("metadata[orderId]", input.orderId);
  body.set("metadata[source]", "lovel");

  const expiresAfter = process.env.STRIPE_PIX_EXPIRES_AFTER_SECONDS;
  if (expiresAfter) {
    body.set("payment_method_options[pix][expires_after_seconds]", expiresAfter);
  }

  const pi = await stripeForm<StripePaymentIntent>(
    "/payment_intents",
    body,
    `lovel-pix-${input.orderId}`,
  );

  const pix = pi.next_action?.pix_display_qr_code;
  const qrCode = pix?.data ?? "";
  let qrCodeBase64 = "";

  if (pix?.image_url_png) {
    try {
      qrCodeBase64 = await pngUrlToBase64(pix.image_url_png);
    } catch (err) {
      console.error("[stripe] PIX QR PNG fetch failed:", err);
    }
  }

  return {
    paymentId: pi.id,
    qrCode,
    qrCodeBase64,
    status: pi.status,
  };
}

export async function fetchStripePaymentIntent(
  paymentIntentId: string,
): Promise<StripePaymentIntent> {
  const res = await fetch(`${STRIPE_API}/payment_intents/${paymentIntentId}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Stripe fetch PI failed (${res.status}): ${errBody}`);
  }
  return (await res.json()) as StripePaymentIntent;
}

/**
 * Verifica assinatura do webhook Stripe (v1) sem SDK.
 * Header: t=timestamp,v1=signature
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=")];
    }),
  );

  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;

  const signed = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  try {
    const a = Buffer.from(signed, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
