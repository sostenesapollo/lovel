/**
 * GA4 + Google Ads via gtag.js
 * Eventos ecommerce padrão — importáveis no Ads / AdSense Attribution depois.
 *
 * IDs: build-time NEXT_PUBLIC_* preferred; runtime fallback via /api/tracking-config
 * (Coolify env) so tags work without rebuilding the image.
 */

import type { CartItem } from "./types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __lovelTracking?: TrackingConfig;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity: number;
};

export type TrackingConfig = {
  ga4Id: string;
  adsId: string;
  purchaseConversionLabel: string;
};

const DEFAULT_GA4 = "G-G99YVC9PDX";

function ensureGtagQueue() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

function readBuildTimeConfig(): TrackingConfig {
  return {
    ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "",
    adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "",
    purchaseConversionLabel:
      process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL?.trim() || "",
  };
}

let configPromise: Promise<TrackingConfig> | null = null;

export function getTrackingConfig(): Promise<TrackingConfig> {
  const build = readBuildTimeConfig();
  if (typeof window !== "undefined" && window.__lovelTracking) {
    return Promise.resolve(window.__lovelTracking);
  }

  const buildCfg: TrackingConfig = {
    ga4Id: build.ga4Id || DEFAULT_GA4,
    adsId: build.adsId,
    purchaseConversionLabel: build.purchaseConversionLabel,
  };

  // Build-time config is authoritative once it has resolved the Ads id, and on
  // the server (where the runtime endpoint isn't reachable). Otherwise we still
  // need the runtime fallback below to pick up the Ads id/label, since only the
  // GA4 id is inlined as NEXT_PUBLIC_* at build time — without this the Ads
  // conversion event never fires. (See /api/tracking-config.)
  if (build.adsId || typeof window === "undefined") {
    if (typeof window !== "undefined") window.__lovelTracking = buildCfg;
    return Promise.resolve(buildCfg);
  }

  if (!configPromise) {
    configPromise = fetch("/api/tracking-config", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) {
          window.__lovelTracking = buildCfg;
          return buildCfg;
        }
        const data = (await res.json()) as {
          ga4Id?: string | null;
          googleAdsId?: string | null;
          googleAdsPurchaseConversionLabel?: string | null;
        };
        // Build-time values win when present; runtime fills the gaps.
        const cfg: TrackingConfig = {
          ga4Id: build.ga4Id || data.ga4Id?.trim() || DEFAULT_GA4,
          adsId: build.adsId || data.googleAdsId?.trim() || "",
          purchaseConversionLabel:
            build.purchaseConversionLabel ||
            data.googleAdsPurchaseConversionLabel?.trim() ||
            "",
        };
        window.__lovelTracking = cfg;
        return cfg;
      })
      .catch(() => {
        window.__lovelTracking = buildCfg;
        return buildCfg;
      });
  }
  return configPromise;
}

export function getGa4Id() {
  if (typeof window !== "undefined" && window.__lovelTracking?.ga4Id) {
    return window.__lovelTracking.ga4Id;
  }
  return process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || DEFAULT_GA4;
}

export function getGoogleAdsId() {
  if (typeof window !== "undefined" && window.__lovelTracking?.adsId) {
    return window.__lovelTracking.adsId;
  }
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
}

export function getPurchaseConversionLabel() {
  if (typeof window !== "undefined" && window.__lovelTracking?.purchaseConversionLabel) {
    return window.__lovelTracking.purchaseConversionLabel;
  }
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL?.trim() || "";
}

export function isAnalyticsConfigured() {
  return Boolean(getGa4Id() || getGoogleAdsId());
}

export function cartItemToAnalytics(item: CartItem): AnalyticsItem {
  return {
    item_id: item.productId,
    item_name: item.name,
    item_brand: item.brand,
    item_variant: item.variantLabel,
    price: item.price,
    quantity: item.quantity,
  };
}

/** Map order.items JSON (from API) into GA4 items. */
export function orderItemsToAnalytics(items: unknown): AnalyticsItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      item_id: String(item.productId ?? item.item_id ?? ""),
      item_name: String(item.name ?? item.item_name ?? "item"),
      item_brand: item.brand ? String(item.brand) : undefined,
      item_variant: item.variantLabel
        ? String(item.variantLabel)
        : item.item_variant
          ? String(item.item_variant)
          : undefined,
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 1),
    };
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  ensureGtagQueue();
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function trackViewItem(item: AnalyticsItem, value?: number) {
  trackEvent("view_item", {
    currency: "BRL",
    value: value ?? item.price * item.quantity,
    items: [item],
  });
}

export function trackAddToCart(item: AnalyticsItem) {
  trackEvent("add_to_cart", {
    currency: "BRL",
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  trackEvent("begin_checkout", {
    currency: "BRL",
    value,
    items,
  });
}

export function trackAddShippingInfo(items: AnalyticsItem[], value: number, shippingTier?: string) {
  trackEvent("add_shipping_info", {
    currency: "BRL",
    value,
    shipping_tier: shippingTier,
    items,
  });
}

export function trackAddPaymentInfo(items: AnalyticsItem[], value: number, paymentType: string) {
  trackEvent("add_payment_info", {
    currency: "BRL",
    value,
    payment_type: paymentType,
    items,
  });
}

const PURCHASE_DEDUP_KEY = "lovel_purchase_tracked";

function alreadyTrackedPurchase(transactionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(PURCHASE_DEDUP_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    return ids.includes(transactionId);
  } catch {
    return false;
  }
}

function markTrackedPurchase(transactionId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(PURCHASE_DEDUP_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(transactionId)) {
      ids.push(transactionId);
      sessionStorage.setItem(PURCHASE_DEDUP_KEY, JSON.stringify(ids.slice(-50)));
    }
  } catch {
    /* ignore */
  }
}

export function trackPurchase(opts: {
  transactionId: string;
  value: number;
  shipping: number;
  tax?: number;
  items: AnalyticsItem[];
  coupon?: string;
}) {
  if (alreadyTrackedPurchase(opts.transactionId)) return;
  markTrackedPurchase(opts.transactionId);

  trackEvent("purchase", {
    transaction_id: opts.transactionId,
    currency: "BRL",
    value: opts.value,
    shipping: opts.shipping,
    tax: opts.tax ?? 0,
    coupon: opts.coupon,
    items: opts.items,
  });

  const adsId = getGoogleAdsId();
  const label = getPurchaseConversionLabel();
  if (adsId && label) {
    trackEvent("conversion", {
      send_to: `${adsId}/${label}`,
      value: opts.value,
      currency: "BRL",
      transaction_id: opts.transactionId,
    });
  }
}

/** Poll order until paid, then fire purchase (PIX success screen). */
export function watchOrderPaidAndTrack(opts: {
  orderId: string;
  value: number;
  shipping: number;
  items: AnalyticsItem[];
  coupon?: string;
  intervalMs?: number;
  maxAttempts?: number;
}): () => void {
  let attempts = 0;
  const max = opts.maxAttempts ?? 120;
  const interval = opts.intervalMs ?? 3000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const tick = async () => {
    if (cancelled) return;
    attempts += 1;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(opts.orderId)}`, {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        if (data.status === "paid" || data.status === "shipped" || data.status === "delivered") {
          trackPurchase({
            transactionId: opts.orderId,
            value: opts.value,
            shipping: opts.shipping,
            items: opts.items,
            coupon: opts.coupon,
          });
          return;
        }
      }
    } catch {
      /* retry */
    }
    if (!cancelled && attempts < max) {
      timer = setTimeout(tick, interval);
    }
  };

  timer = setTimeout(tick, 1500);
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
