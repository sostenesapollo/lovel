/**
 * GA4 + Google Ads via gtag.js
 * Eventos ecommerce padrão — importáveis no Ads / AdSense Attribution depois.
 */

import type { CartItem } from "./types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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

function ensureGtagQueue() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

export function getGa4Id() {
  return process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "";
}

export function getGoogleAdsId() {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
}

export function getPurchaseConversionLabel() {
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

export function trackPurchase(opts: {
  transactionId: string;
  value: number;
  shipping: number;
  tax?: number;
  items: AnalyticsItem[];
  coupon?: string;
}) {
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
