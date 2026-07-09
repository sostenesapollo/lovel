import { CONFIG } from "./config.js";
import { isFractionalVariant, getFullBottleVariantIndex, getVariant } from "./utils.js";

const STORAGE_KEY = "lovel_cart";
const COUPON_KEY = "lovel_coupon";
const FIRST_PURCHASE_KEY = "lovel_has_purchased";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: items }));
}

function makeItemKey(productId, variantIndex) {
  return `${productId}-${variantIndex}`;
}

export const cart = {
  getItems() {
    return load();
  },

  getCount() {
    return load().reduce((sum, i) => sum + i.quantity, 0);
  },

  getSubtotal() {
    return load().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  add(product, variantIndex, options = {}) {
    const variant = getVariant(product, variantIndex);
    if (!variant || product.soldOut || variant.disabled) return false;

    const items = load();
    const key = makeItemKey(product.id, variantIndex);
    const existing = items.find((i) => i.key === key && !i.crossSell);

    const item = {
      key,
      productId: product.id,
      variantIndex,
      quantity: 1,
      price: options.crossSellPrice ?? variant.price,
      crossSell: options.crossSell ?? false,
      crossSellDiscount: options.crossSellDiscount ?? false,
      name: product.name,
      brand: product.brand,
      variantLabel: variant.label,
      image: product.image,
    };

    if (existing && !options.crossSell) {
      existing.quantity += 1;
    } else {
      items.push(item);
    }

    save(items);
    return true;
  },

  remove(key) {
    save(load().filter((i) => i.key !== key));
  },

  updateQuantity(key, quantity) {
    const items = load();
    const item = items.find((i) => i.key === key);
    if (!item) return;
    if (quantity <= 0) {
      cart.remove(key);
      return;
    }
    item.quantity = quantity;
    save(items);
  },

  clear() {
    save([]);
  },

  hasProductVariant(productId, variantIndex) {
    const key = makeItemKey(productId, variantIndex);
    return load().some((i) => i.key === key);
  },

  getSavedCoupon() {
    try {
      return JSON.parse(localStorage.getItem(COUPON_KEY));
    } catch {
      return null;
    }
  },

  saveCoupon(coupon) {
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
    else localStorage.removeItem(COUPON_KEY);
  },

  isFirstPurchase() {
    return !localStorage.getItem(FIRST_PURCHASE_KEY);
  },

  markPurchased() {
    localStorage.setItem(FIRST_PURCHASE_KEY, "1");
  },

  /** Cross-sell: decant/fracionado → frasco inteiro com 10% off */
  getCrossSellOffers(allProducts) {
    const items = load();
    const offers = [];

    for (const item of items) {
      if (item.crossSell) continue;
      if (!isFractionalVariant(item.variantLabel)) continue;

      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) continue;

      const fullIdx = getFullBottleVariantIndex(product);
      if (fullIdx < 0) continue;

      const fullVariant = product.variants[fullIdx];
      if (fullVariant.disabled || product.soldOut) continue;

      const offerKey = makeItemKey(product.id, fullIdx);
      if (items.some((i) => i.key === offerKey)) continue;

      const discountedPrice = fullVariant.price * (1 - CONFIG.crossSellDiscount);

      offers.push({
        product,
        variantIndex: fullIdx,
        variant: fullVariant,
        originalPrice: fullVariant.price,
        discountedPrice,
        discountPercent: CONFIG.crossSellDiscount * 100,
        triggerItem: item,
        message: `Gostou do ${item.variantLabel} de ${product.name}? Adicione o Frasco Inteiro com ${CONFIG.crossSellDiscount * 100}% de desconto!`,
      });
    }

    return offers;
  },

  calculateTotals(coupon = null) {
    const subtotal = cart.getSubtotal();
    let discount = 0;
    let shipping = subtotal >= CONFIG.freeShippingThreshold ? 0 : 19.9;
    let couponData = coupon ?? cart.getSavedCoupon();

    if (couponData?.coupon) {
      const c = couponData.coupon;
      if (c.type === "percent") {
        discount = subtotal * (c.value / 100);
      } else if (c.type === "free_shipping") {
        shipping = 0;
      }
    }

    const afterDiscount = Math.max(0, subtotal - discount);
    const totalWithShipping = afterDiscount + shipping;

    return {
      subtotal,
      discount,
      shipping,
      total: totalWithShipping,
      pixTotal: totalWithShipping * (1 - CONFIG.pixDiscount),
      coupon: couponData,
    };
  },
};
