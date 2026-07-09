/**
 * GA4 Measurement Protocol — server-side purchase (webhooks).
 * Covers PIX/card when the buyer never returns to the success page.
 *
 * Admin → Data streams → Measurement Protocol API secrets
 * Set GA4_API_SECRET (+ NEXT_PUBLIC_GA4_MEASUREMENT_ID already in Coolify).
 */

export type Ga4ServerPurchaseParams = {
  transactionId: string;
  value: number;
  currency?: string;
  shipping?: number;
  items?: Array<{
    item_id: string;
    item_name: string;
    price?: number;
    quantity?: number;
  }>;
  /** Real GA4 client_id from browser `_ga` cookie when available. */
  gaClientId?: string | null;
};

function measurementId(): string | null {
  const raw =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
    "";
  const trimmed = raw.trim();
  return trimmed || null;
}

function stableClientId(params: Ga4ServerPurchaseParams): string {
  if (params.gaClientId?.trim()) return params.gaClientId.trim();
  return `txn_${params.transactionId}`;
}

/** Fire-and-forget GA4 MP purchase. Skips when API secret missing. */
export function sendGa4PurchaseFromServer(params: Ga4ServerPurchaseParams): void {
  const apiSecret =
    process.env.GA4_API_SECRET?.trim() ||
    process.env.GA4_MEASUREMENT_PROTOCOL_SECRET?.trim();
  const mid = measurementId();

  if (!apiSecret || !mid) {
    console.log(
      "[ga4-mp] skipped (set GA4_API_SECRET and NEXT_PUBLIC_GA4_MEASUREMENT_ID)",
    );
    return;
  }

  if (params.value <= 0) return;

  const eventParams: Record<string, unknown> = {
    transaction_id: params.transactionId,
    value: params.value,
    currency: (params.currency ?? "BRL").toUpperCase(),
    engagement_time_msec: 100,
  };
  if (typeof params.shipping === "number") {
    eventParams.shipping = params.shipping;
  }
  if (params.items?.length) {
    eventParams.items = params.items;
  }

  const body = {
    client_id: stableClientId(params),
    events: [{ name: "purchase", params: eventParams }],
  };

  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", mid);
  url.searchParams.set("api_secret", apiSecret);

  void fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error("[ga4-mp] failed:", res.status, await res.text());
        return;
      }
      console.log("[ga4-mp] purchase sent:", params.transactionId);
    })
    .catch((err) => {
      console.error("[ga4-mp] request error:", err);
    });
}
