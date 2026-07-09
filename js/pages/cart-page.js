import { api } from "../api.js";
import { initApp, addCrossSellOffer } from "../app.js";
import { cart } from "../cart.js";
import { formatPrice } from "../utils.js";

function renderCartItems() {
  const items = cart.getItems();
  const container = document.getElementById("cart-items");
  const empty = document.getElementById("cart-empty");
  const content = document.getElementById("cart-content");

  if (items.length === 0) {
    empty.style.display = "";
    content.style.display = "none";
    return;
  }

  empty.style.display = "none";
  content.style.display = "";

  container.innerHTML = items
    .map(
      (item) => `
    <div class="cart-item" data-key="${item.key}">
      <img class="cart-item__img" src="${item.image}" alt="${item.name}">
      <div class="cart-item__info">
        <span class="cart-item__brand">${item.brand}</span>
        <h3 class="cart-item__name">${item.name}</h3>
        <span class="cart-item__variant">${item.variantLabel}${item.crossSellDiscount ? ' <span class="badge badge--promo">Cross-sell -10%</span>' : ""}</span>
        <div class="cart-item__qty">
          <button class="qty-btn" data-qty-minus="${item.key}">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-qty-plus="${item.key}">+</button>
        </div>
      </div>
      <div class="cart-item__price">
        <span>${formatPrice(item.price * item.quantity)}</span>
        <button class="cart-item__remove" data-remove="${item.key}">Remover</button>
      </div>
    </div>`
    )
    .join("");
}

function renderCrossSell(allProducts) {
  const offers = cart.getCrossSellOffers(allProducts);
  const section = document.getElementById("cross-sell-section");

  if (offers.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "";
  document.getElementById("cross-sell-list").innerHTML = offers
    .map(
      (o, i) => `
    <div class="cross-sell-card">
      <img src="${o.product.image}" alt="${o.product.name}">
      <div class="cross-sell-card__body">
        <p class="cross-sell-card__msg">${o.message}</p>
        <div class="cross-sell-card__price">
          <span class="cross-sell-card__old">${formatPrice(o.originalPrice)}</span>
          <span class="cross-sell-card__new">${formatPrice(o.discountedPrice)}</span>
        </div>
        <button class="btn btn--primary btn--sm" data-cross-sell="${i}">Adicionar Frasco Inteiro</button>
      </div>
    </div>`
    )
    .join("");

  section._offers = offers;
}

function renderSummary() {
  const totals = cart.calculateTotals();
  document.getElementById("summary-subtotal").textContent = formatPrice(totals.subtotal);
  document.getElementById("summary-shipping").textContent =
    totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping);
  document.getElementById("summary-total").textContent = formatPrice(totals.total);
  document.getElementById("summary-pix").textContent = formatPrice(totals.pixTotal);
}

function bindEvents(allProducts) {
  document.getElementById("cart-items")?.addEventListener("click", (e) => {
    const minus = e.target.closest("[data-qty-minus]");
    const plus = e.target.closest("[data-qty-plus]");
    const remove = e.target.closest("[data-remove]");

    if (minus) {
      const item = cart.getItems().find((i) => i.key === minus.dataset.qtyMinus);
      if (item) cart.updateQuantity(item.key, item.quantity - 1);
      refresh(allProducts);
    }
    if (plus) {
      const item = cart.getItems().find((i) => i.key === plus.dataset.qtyPlus);
      if (item) cart.updateQuantity(item.key, item.quantity + 1);
      refresh(allProducts);
    }
    if (remove) {
      cart.remove(remove.dataset.remove);
      refresh(allProducts);
    }
  });

  document.getElementById("cross-sell-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-cross-sell]");
    if (!btn) return;
    const offer = document.getElementById("cross-sell-section")._offers[parseInt(btn.dataset.crossSell, 10)];
    if (offer && await addCrossSellOffer(offer)) {
      btn.textContent = "Adicionado ✓";
      refresh(allProducts);
    }
  });

  document.getElementById("btn-checkout")?.addEventListener("click", () => {
    if (cart.getCount() > 0) window.location.href = "checkout.html";
  });
}

function refresh(allProducts) {
  renderCartItems();
  renderCrossSell(allProducts);
  renderSummary();
}

async function init() {
  initApp();
  const allProducts = await api.getProducts();
  refresh(allProducts);
  bindEvents(allProducts);
  window.addEventListener("cart:updated", () => refresh(allProducts));
}

init();
