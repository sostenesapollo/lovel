const MP_API = "https://api.mercadopago.com/v1/payments";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  return token;
}

type PixPaymentResult = {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  status: string;
};

type MpPaymentResponse = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

export async function createPixPayment(input: {
  orderId: string;
  amount: number;
  email: string;
  description: string;
}): Promise<PixPaymentResult> {
  const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;

  const res = await fetch(MP_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${input.orderId}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.email },
      external_reference: input.orderId,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mercado Pago create payment failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as MpPaymentResponse;
  const tx = data.point_of_interaction?.transaction_data;

  return {
    paymentId: String(data.id),
    qrCode: tx?.qr_code ?? "",
    qrCodeBase64: tx?.qr_code_base64 ?? "",
    status: data.status,
  };
}

export async function fetchPayment(paymentId: string | number): Promise<MpPaymentResponse> {
  const res = await fetch(`${MP_API}/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mercado Pago fetch payment failed (${res.status}): ${errBody}`);
  }

  return (await res.json()) as MpPaymentResponse;
}
