"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Coupon, Product } from "@/lib/types";
import {
  calcTotals,
  formatPrice,
  getCrossSellOffers,
  getVariant,
  isFractionalVariant,
  type ShippingDestination,
} from "@/lib/utils";
import { CROSS_SELL_DISCOUNT, FULL_BOTTLE_LABEL } from "@/lib/constants";
import { cartItemToAnalytics, trackAddToCart } from "@/lib/analytics";

const CART_KEY = "lovel_cart";
const COUPON_KEY = "lovel_coupon";
const FIRST_PURCHASE_KEY = "lovel_has_purchased";
const SHIPPING_DEST_KEY = "lovel_shipping_dest";

type CartContextValue = {
  items: CartItem[];
  coupon: Coupon | null;
  count: number;
  subtotal: number;
  shippingDest: ShippingDestination | null;
  setShippingDest: (dest: ShippingDestination | null) => void;
  add: (product: Product, variantIndex: number, options?: { crossSell?: boolean; crossSellPrice?: number }) => boolean;
  remove: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  setCoupon: (coupon: Coupon | null) => void;
  isFirstPurchase: boolean;
  markPurchased: () => void;
  totals: (payment?: "pix" | "card") => ReturnType<typeof calcTotals>;
  crossSellOffers: (products: Product[]) => ReturnType<typeof getCrossSellOffers>;
};

const CartContext = createContext<CartContextValue | null>(null);

function makeKey(productId: string, variantIndex: number) {
  return `${productId}-${variantIndex}`;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadShippingDest(): ShippingDestination | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SHIPPING_DEST_KEY) || "null");
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCouponState] = useState<Coupon | null>(null);
  const [isFirstPurchase, setIsFirstPurchase] = useState(true);
  const [shippingDest, setShippingDestState] = useState<ShippingDestination | null>(null);

  useEffect(() => {
    setItems(loadCart());
    try {
      setCouponState(JSON.parse(localStorage.getItem(COUPON_KEY) || "null"));
    } catch {
      setCouponState(null);
    }
    setIsFirstPurchase(!localStorage.getItem(FIRST_PURCHASE_KEY));
    setShippingDestState(loadShippingDest());
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  }, []);

  const setShippingDest = useCallback((dest: ShippingDestination | null) => {
    setShippingDestState(dest);
    if (dest?.cep || dest?.state) {
      localStorage.setItem(SHIPPING_DEST_KEY, JSON.stringify(dest));
    } else {
      localStorage.removeItem(SHIPPING_DEST_KEY);
    }
  }, []);

  const add = useCallback(
    (product: Product, variantIndex: number, options?: { crossSell?: boolean; crossSellPrice?: number }) => {
      const variant = getVariant(product, variantIndex);
      if (!variant || product.soldOut || variant.disabled) return false;

      const current = loadCart();
      const key = makeKey(product.id, variantIndex);
      const existing = current.find((i) => i.key === key && !i.crossSell);

      const item: CartItem = {
        key,
        productId: product.id,
        variantIndex,
        quantity: 1,
        price: options?.crossSellPrice ?? variant.price,
        crossSell: options?.crossSell ?? false,
        crossSellDiscount: options?.crossSell ?? false,
        name: product.name,
        brand: product.brand,
        variantLabel: variant.label,
        image: product.image,
      };

      if (existing && !options?.crossSell) {
        existing.quantity += 1;
        persist([...current]);
        trackAddToCart(cartItemToAnalytics({ ...existing }));
      } else {
        persist([...current, item]);
        trackAddToCart(cartItemToAnalytics(item));
      }
      return true;
    },
    [persist],
  );

  const remove = useCallback(
    (key: string) => persist(loadCart().filter((i) => i.key !== key)),
    [persist],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      const current = loadCart();
      if (quantity <= 0) {
        persist(current.filter((i) => i.key !== key));
        return;
      }
      persist(current.map((i) => (i.key === key ? { ...i, quantity } : i)));
    },
    [persist],
  );

  const clear = useCallback(() => {
    persist([]);
    setCouponState(null);
    localStorage.removeItem(COUPON_KEY);
  }, [persist]);

  const setCoupon = useCallback((c: Coupon | null) => {
    setCouponState(c);
    if (c) localStorage.setItem(COUPON_KEY, JSON.stringify(c));
    else localStorage.removeItem(COUPON_KEY);
  }, []);

  const markPurchased = useCallback(() => {
    localStorage.setItem(FIRST_PURCHASE_KEY, "1");
    setIsFirstPurchase(false);
  }, []);

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      coupon,
      count,
      subtotal,
      shippingDest,
      setShippingDest,
      add,
      remove,
      updateQuantity,
      clear,
      setCoupon,
      isFirstPurchase,
      markPurchased,
      totals: (payment = "pix") => calcTotals(items, coupon, payment, isFirstPurchase, shippingDest),
      crossSellOffers: (products) => getCrossSellOffers(items, products),
    }),
    [
      items,
      coupon,
      count,
      subtotal,
      shippingDest,
      setShippingDest,
      add,
      remove,
      updateQuantity,
      clear,
      setCoupon,
      isFirstPurchase,
      markPurchased,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export { formatPrice, isFractionalVariant, FULL_BOTTLE_LABEL, CROSS_SELL_DISCOUNT };
