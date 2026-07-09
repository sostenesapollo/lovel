import {
  CROSS_SELL_DISCOUNT,
  FREE_SHIPPING_THRESHOLD,
  FRACTIONAL_LABELS,
  FULL_BOTTLE_LABEL,
  PIX_DISCOUNT,
  SHIPPING_FLAT,
} from "./constants";
import { quoteShipping } from "./shipping";
import type { CartItem, Coupon, Product } from "./types";

export type ShippingDestination = {
  state?: string | null;
  cep?: string | null;
};

export function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pixPrice(value: number) {
  return value * (1 - PIX_DISCOUNT);
}

export function isFractionalVariant(label: string) {
  return FRACTIONAL_LABELS.includes(label);
}

export function getFullBottleVariantIndex(product: Product) {
  return product.variants.findIndex((v) => v.label === FULL_BOTTLE_LABEL);
}

export function getVariant(product: Product, index?: number) {
  return product.variants[index ?? product.defaultVariant ?? 0];
}

export function productPath(product: Pick<Product, "slug">) {
  return `/produto/${product.slug}`;
}

export function categoryPath(type: string, sub = "") {
  return sub ? `/categoria?tipo=${type}&sub=${sub}` : `/categoria?tipo=${type}`;
}

export function calcSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function calcShipping(
  subtotal: number,
  coupon: Coupon | null,
  freeThreshold = FREE_SHIPPING_THRESHOLD,
  destination?: ShippingDestination | null,
) {
  if (coupon?.type === "free_shipping") return 0;
  if (subtotal >= freeThreshold) return 0;
  const quote = quoteShipping({
    state: destination?.state,
    cep: destination?.cep,
  });
  return quote?.price ?? SHIPPING_FLAT;
}

export function calcCouponDiscount(subtotal: number, coupon: Coupon | null) {
  if (!coupon || coupon.type !== "percent") return 0;
  return subtotal * (coupon.value / 100);
}

export function calcTotals(
  items: CartItem[],
  coupon: Coupon | null,
  payment: "pix" | "card" = "pix",
  isFirstPurchase = false,
  destination?: ShippingDestination | null,
) {
  const subtotal = calcSubtotal(items);
  let discount = calcCouponDiscount(subtotal, coupon);

  if (coupon?.firstPurchaseOnly && !isFirstPurchase) {
    discount = 0;
  }

  const afterCoupon = Math.max(0, subtotal - discount);
  const shipping = calcShipping(afterCoupon, coupon, FREE_SHIPPING_THRESHOLD, destination);
  let total = afterCoupon + shipping;

  if (payment === "pix") {
    total = total * (1 - PIX_DISCOUNT);
  }

  return { subtotal, discount, shipping, total };
}

export function getCrossSellOffers(items: CartItem[], products: Product[]) {
  const offers: Array<{ product: Product; variantIndex: number; price: number }> = [];

  for (const item of items) {
    if (item.crossSell) continue;
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    const variant = getVariant(product, item.variantIndex);
    if (!isFractionalVariant(variant.label)) continue;

    const fullIdx = getFullBottleVariantIndex(product);
    if (fullIdx < 0) continue;

    const fullVariant = product.variants[fullIdx];
    const alreadyHas = items.some(
      (i) => i.productId === product.id && i.variantIndex === fullIdx,
    );
    if (alreadyHas) continue;

    offers.push({
      product,
      variantIndex: fullIdx,
      price: fullVariant.price * (1 - CROSS_SELL_DISCOUNT),
    });
  }

  return offers;
}

export function interpolateTemplate(
  body: string,
  vars: Record<string, string>,
) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
