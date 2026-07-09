import { api } from "../api.js";
import { initApp, addToCartById } from "../app.js";
import { renderBadges, renderVariantButtons } from "../components.js";
import { formatPrice, pixPrice, getQueryParam, getVariant } from "../utils.js";

let product = null;
let selectedVariant = 0;

function renderPDP() {
  const variant = getVariant(product, selectedVariant);

  document.title = `${product.name} — LOVEL`;
  document.getElementById("pdp-brand").textContent = product.brand;
  document.getElementById("pdp-name").textContent = product.name;
  document.getElementById("pdp-category").textContent = product.category;
  document.getElementById("pdp-description").textContent = product.description;
  document.getElementById("pdp-price").textContent = formatPrice(variant.price);
  document.getElementById("pdp-pix").textContent = `ou ${formatPrice(pixPrice(variant.price))} no PIX (-5%)`;
  document.getElementById("pdp-badges").innerHTML = renderBadges(product.badges);
  document.getElementById("pdp-variants").innerHTML = renderVariantButtons(product, selectedVariant, "pdp");

  const mainImg = document.getElementById("pdp-main-image");
  mainImg.src = product.images?.[0] || product.image;
  mainImg.alt = product.name;

  const thumbs = document.getElementById("pdp-thumbs");
  if (product.images?.length > 1) {
    thumbs.innerHTML = product.images
      .map(
        (img, i) =>
          `<button class="pdp-thumb${i === 0 ? " pdp-thumb--active" : ""}" data-img="${img}"><img src="${img}" alt=""></button>`
      )
      .join("");
  } else {
    thumbs.innerHTML = "";
  }

  if (product.notes) {
    document.getElementById("pdp-notes").innerHTML = `
      <div class="pdp-notes__item"><strong>Topo</strong><span>${product.notes.top}</span></div>
      <div class="pdp-notes__item"><strong>Coração</strong><span>${product.notes.heart}</span></div>
      <div class="pdp-notes__item"><strong>Fundo</strong><span>${product.notes.base}</span></div>`;
  }

  const addBtn = document.getElementById("pdp-add-cart");
  addBtn.disabled = product.soldOut || variant.disabled;
  addBtn.textContent = product.soldOut ? "Indisponível" : "Adicionar ao Carrinho";

  const oldPriceEl = document.getElementById("pdp-old-price");
  if (variant.oldPrice) {
    oldPriceEl.textContent = formatPrice(variant.oldPrice);
    oldPriceEl.style.display = "";
  } else {
    oldPriceEl.style.display = "none";
  }
}

function bindPDPEvents() {
  document.getElementById("pdp-variants")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".variant-btn");
    if (!btn || btn.disabled) return;
    selectedVariant = parseInt(btn.dataset.variant, 10);
    renderPDP();
  });

  document.getElementById("pdp-thumbs")?.addEventListener("click", (e) => {
    const thumb = e.target.closest(".pdp-thumb");
    if (!thumb) return;
    document.getElementById("pdp-main-image").src = thumb.dataset.img;
    document.querySelectorAll(".pdp-thumb").forEach((t) => t.classList.remove("pdp-thumb--active"));
    thumb.classList.add("pdp-thumb--active");
  });

  document.getElementById("pdp-add-cart")?.addEventListener("click", async () => {
    const btn = document.getElementById("pdp-add-cart");
    if (await addToCartById(product.id, selectedVariant)) {
      btn.textContent = "Adicionado ✓";
      setTimeout(() => { btn.textContent = "Adicionar ao Carrinho"; }, 1500);
    }
  });
}

async function loadRelated() {
  const related = (await api.getProducts({ tipo: product.type }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const el = document.getElementById("pdp-related");
  if (!el) return;

  el.innerHTML = related
    .map(
      (p) => `
      <a href="produto.html?id=${p.id}" class="pdp-related__item">
        <img src="${p.image}" alt="${p.name}">
        <span class="pdp-related__brand">${p.brand}</span>
        <span class="pdp-related__name">${p.name}</span>
        <span class="pdp-related__price">${formatPrice(p.variants[p.defaultVariant].price)}</span>
      </a>`
    )
    .join("");
}

async function init() {
  initApp();
  const id = getQueryParam("id") || getQueryParam("slug");
  if (!id) {
    window.location.href = "index.html";
    return;
  }

  product = await api.getProduct(id);
  if (!product) {
    window.location.href = "index.html";
    return;
  }

  selectedVariant = product.defaultVariant ?? 0;
  renderPDP();
  bindPDPEvents();
  loadRelated();
}

init();
