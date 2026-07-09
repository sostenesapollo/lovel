const MP_API = "https://api.mercadopago.com/v1/payments";
const MP_PREFERENCES = "https://api.mercadopago.com/checkout/preferences";

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

type CheckoutPreferenceResult = {
  preferenceId: string;
  initPoint: string;
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

/** Checkout Pro — redireciona o cliente para pagar com cartão no Mercado Pago. */
export async function createCardCheckoutPreference(input: {
  orderId: string;
  amount: number;
  email: string;
  name?: string;
  description: string;
}): Promise<CheckoutPreferenceResult> {
  const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;
  // auto_return do MP exige HTTPS — em localhost usamos o domínio de prod no retorno
  const publicBase = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://lovelessence.com"
  ).replace(/\/$/, "");
  const returnBase = publicBase.startsWith("https://")
    ? publicBase
    : "https://lovelessence.com";

  const successUrl = `${returnBase}/checkout/retorno?orderId=${encodeURIComponent(input.orderId)}&status=success`;
  const failureUrl = `${returnBase}/checkout/retorno?orderId=${encodeURIComponent(input.orderId)}&status=failure`;
  const pendingUrl = `${returnBase}/checkout/retorno?orderId=${encodeURIComponent(input.orderId)}&status=pending`;

  const res = await fetch(MP_PREFERENCES, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: input.orderId,
          title: input.description.slice(0, 256),
          quantity: 1,
          unit_price: Number(input.amount.toFixed(2)),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: input.email,
        ...(input.name ? { name: input.name } : {}),
      },
      external_reference: input.orderId,
      statement_descriptor: "LOVEL",
      binary_mode: true,
      auto_return: "approved",
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
        installments: 3,
      },
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mercado Pago preference failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };

  const initPoint = data.init_point || data.sandbox_init_point;
  if (!data.id || !initPoint) {
    throw new Error("Mercado Pago preference sem init_point");
  }

  return { preferenceId: data.id, initPoint };
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
