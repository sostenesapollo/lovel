import { cart } from "./cart.js";
import { formatPrice, pixPrice, getVariant } from "./utils.js";
import { mountLayout, updateCartBadge } from "./components.js";
import { api } from "./api.js";

const selectedVariants = {};

export function getSelectedVariant(productId) {
  return selectedVariants[productId];
}

export function setSelectedVariant(productId, index) {
  selectedVariants[productId] = index;
}

export function initSelectedVariants(products) {
  products.forEach((p) => {
    selectedVariants[p.id] = p.defaultVariant ?? 0;
  });
}

export function updateProductPrice(productId, variantIndex) {
  const priceEl = document.querySelector(`[data-price-for="${productId}"]`);
  const card = document.querySelector(`[data-id="${productId}"]`);
  if (!priceEl) return;

  api.getProduct(productId).then((product) => {
    if (!product) return;
    const variant = product.variants[variantIndex];

    priceEl.classList.add("product-card__price--updating");
    setTimeout(() => {
      priceEl.textContent = formatPrice(variant.price);
      priceEl.classList.remove("product-card__price--updating");

      const pixEl = card?.querySelector(".product-card__pix");
      if (pixEl) pixEl.textContent = `ou ${formatPrice(pixPrice(variant.price))} no PIX (-5%)`;

      const oldPriceEl = card?.querySelector(".product-card__price-old");
      if (variant.oldPrice) {
        if (!oldPriceEl) {
          priceEl.insertAdjacentHTML("afterend", `<span class="product-card__price-old">${formatPrice(variant.oldPrice)}</span>`);
        } else {
          oldPriceEl.textContent = formatPrice(variant.oldPrice);
        }
      } else {
        oldPriceEl?.remove();
      }
    }, 120);

    card?.querySelectorAll(".variant-btn").forEach((btn, i) => {
      btn.classList.toggle("variant-btn--active", i === variantIndex);
      btn.setAttribute("aria-pressed", String(i === variantIndex));
    });

    const addBtn = card?.querySelector("[data-add-cart]");
    if (addBtn) addBtn.dataset.variant = variantIndex;
  });
}

export function bindGlobalEvents() {
  document.addEventListener("click", async (e) => {
    const variantBtn = e.target.closest(".variant-btn");
    if (variantBtn && !variantBtn.disabled && variantBtn.dataset.context === "card") {
      e.preventDefault();
      const productId = variantBtn.dataset.product;
      const variantIndex = parseInt(variantBtn.dataset.variant, 10);
      setSelectedVariant(productId, variantIndex);
      updateProductPrice(productId, variantIndex);
      return;
    }

    const addBtn = e.target.closest("[data-add-cart]");
    if (addBtn && !addBtn.disabled) {
      e.preventDefault();
      const productId = addBtn.dataset.product || addBtn.dataset.addCart;
      const variantIndex = parseInt(addBtn.dataset.variant ?? getSelectedVariant(productId) ?? 0, 10);
      const product = await api.getProduct(productId);
      if (product && cart.add(product, variantIndex)) {
        updateCartBadge();
        const original = addBtn.textContent;
        addBtn.textContent = "Adicionado ✓";
        setTimeout(() => { addBtn.textContent = original; }, 1500);
      }
      return;
    }

    const decantLink = e.target.closest("[data-open-decant-modal]");
    if (decantLink) {
      e.preventDefault();
      document.getElementById("decant-modal")?.classList.add("modal-overlay--open");
      return;
    }

    const closeModal = e.target.closest("[data-close-modal]");
    if (closeModal) {
      document.getElementById("decant-modal")?.classList.remove("modal-overlay--open");
      return;
    }

    const menuToggle = e.target.closest(".menu-toggle");
    if (menuToggle) {
      document.querySelector(".mobile-nav")?.classList.toggle("mobile-nav--open");
      return;
    }
  });

  document.getElementById("decant-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("modal-overlay--open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("decant-modal")?.classList.remove("modal-overlay--open");
      document.querySelector(".mobile-nav")?.classList.remove("mobile-nav--open");
    }
  });

  window.addEventListener("cart:updated", updateCartBadge);
}

export function initApp(activeNav = "") {
  mountLayout(activeNav);
  bindGlobalEvents();
  updateCartBadge();
  loadDynamicBanner();
}

async function loadDynamicBanner() {
  try {
    const promos = await api.getPublicPromotions();
    if (!promos?.banners?.length) return;

    const track = document.querySelector(".top-banner__track");
    if (!track) return;

    track.innerHTML = promos.banners
      .map(
        (b, i) => `
        <span class="top-banner__item">${b.highlight ? `<strong>${b.highlight}</strong> ` : ""}${b.text}</span>
        ${i < promos.banners.length - 1 ? '<span class="top-banner__divider">|</span>' : ""}`
      )
      .join("");
  } catch { /* keep default banner */ }
}

export async function addToCartById(productId, variantIndex) {
  const product = await api.getProduct(productId);
  if (!product) return false;
  const ok = cart.add(product, variantIndex);
  if (ok) updateCartBadge();
  return ok;
}

export async function addCrossSellOffer(offer) {
  const ok = cart.add(offer.product, offer.variantIndex, {
    crossSell: true,
    crossSellPrice: offer.discountedPrice,
    crossSellDiscount: true,
  });
  if (ok) updateCartBadge();
  return ok;
}

export { formatPrice, pixPrice, getVariant };
