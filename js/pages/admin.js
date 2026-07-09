import { initApp } from "../app.js";
import { auth } from "../auth.js";
import { api } from "../api.js";
import { formatPrice } from "../utils.js";
import { CONFIG, CATEGORIES } from "../config.js";

const STATUS_OPTIONS = ["pending_payment", "paid", "shipped", "delivered", "cancelled"];

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getVariantPrice(product, label) {
  return product.variants?.find((v) => v.label === label)?.price ?? "";
}

function buildVariantsFromForm(form, productId) {
  const type = form.type.value;
  const prefix = productId || "new";
  const variants = [];

  if (type === "perfumes") {
    if (form.price4ml.value) variants.push({ label: "4ml", price: parseFloat(form.price4ml.value), sku: `${prefix}-D4` });
    if (form.price10ml.value) variants.push({ label: "10ml", price: parseFloat(form.price10ml.value), sku: `${prefix}-D10` });
    if (form.priceFull.value) variants.push({ label: "Frasco Inteiro", price: parseFloat(form.priceFull.value), sku: `${prefix}-FI` });
  } else if (type === "cabelos") {
    if (form.price30g.value) variants.push({ label: "30g", price: parseFloat(form.price30g.value), sku: `${prefix}-F30` });
    if (form.price50g.value) variants.push({ label: "50g", price: parseFloat(form.price50g.value), sku: `${prefix}-F50` });
    if (form.priceFull.value) variants.push({ label: "Frasco Inteiro", price: parseFloat(form.priceFull.value), sku: `${prefix}-FI` });
  } else {
    if (form.priceFull.value) variants.push({ label: "Frasco Inteiro", price: parseFloat(form.priceFull.value), sku: `${prefix}-FI` });
  }

  return variants.length ? variants : [{ label: "Frasco Inteiro", price: 0, sku: `${prefix}-FI` }];
}

function buildProductFromForm(form) {
  const type = form.type.value;
  const sub = form.subcategory.value;
  const typeLabels = { perfumes: "Perfumes", cabelos: "Cabelos", skincare: "Skincare" };
  const subLabel = CATEGORIES[type]?.subcategories.find((s) => s.slug === sub)?.label || sub;
  const editId = form.editId.value;
  const id = editId || `${type[0]}${Date.now()}`;
  const variants = buildVariantsFromForm(form, id);

  return {
    id,
    slug: slugify(`${form.brand.value}-${form.name.value}`),
    brand: form.brand.value.trim(),
    name: form.name.value.trim(),
    type,
    subcategory: sub,
    category: `${typeLabels[type]} · ${subLabel}`,
    image: form.image.value.trim(),
    images: [form.image.value.trim()],
    description: form.description.value.trim(),
    badges: [],
    variants,
    defaultVariant: 0,
    singleVariant: variants.length <= 1,
    soldOut: form.soldOut.checked,
    isLaunch: form.isLaunch.checked,
  };
}

function populateSubcategories(type, selected = "") {
  const select = document.getElementById("product-subcategory");
  const subs = CATEGORIES[type]?.subcategories || [];
  select.innerHTML = subs.map((s) => `<option value="${s.slug}" ${s.slug === selected ? "selected" : ""}>${s.label}</option>`).join("");
}

function toggleVariantFields(type) {
  document.querySelectorAll(".variant-field").forEach((el) => {
    const types = el.dataset.for.split(" ");
    el.style.display = types.includes(type) ? "" : "none";
  });
}

function openProductModal(product = null) {
  const modal = document.getElementById("product-modal");
  const form = document.getElementById("product-form");
  const title = document.getElementById("product-modal-title");
  const msg = document.getElementById("product-form-message");

  form.reset();
  msg.textContent = "";

  if (product) {
    title.textContent = "Editar Produto";
    form.editId.value = product.id;
    form.name.value = product.name;
    form.brand.value = product.brand;
    form.type.value = product.type;
    populateSubcategories(product.type, product.subcategory);
    form.image.value = product.image;
    form.description.value = product.description || "";
    form.price4ml.value = getVariantPrice(product, "4ml");
    form.price10ml.value = getVariantPrice(product, "10ml");
    form.price30g.value = getVariantPrice(product, "30g");
    form.price50g.value = getVariantPrice(product, "50g");
    form.priceFull.value = getVariantPrice(product, "Frasco Inteiro");
    form.soldOut.checked = !!product.soldOut;
    form.isLaunch.checked = !!product.isLaunch;
  } else {
    title.textContent = "Novo Produto";
    form.editId.value = "";
    populateSubcategories("perfumes");
  }

  toggleVariantFields(form.type.value);
  modal.classList.add("modal-overlay--open");
}

function closeProductModal() {
  document.getElementById("product-modal")?.classList.remove("modal-overlay--open");
}

async function renderStats() {
  const stats = await api.getStats();
  document.getElementById("admin-stats").innerHTML = `
    <div class="stat-card"><span class="stat-card__value">${stats.orders}</span><span class="stat-card__label">Pedidos</span></div>
    <div class="stat-card"><span class="stat-card__value">${stats.products}</span><span class="stat-card__label">Produtos</span></div>
    <div class="stat-card"><span class="stat-card__value">${formatPrice(stats.revenue || 0)}</span><span class="stat-card__label">Receita</span></div>
    <div class="stat-card"><span class="stat-card__value">${stats.users || "—"}</span><span class="stat-card__label">Usuários</span></div>`;
}

async function renderOrders() {
  const orders = await api.getAllOrders();
  const tbody = document.querySelector("#orders-table tbody");

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum pedido ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td><strong>${o.orderId || o.id}</strong><br><small>${new Date(o.createdAt).toLocaleString("pt-BR")}</small></td>
      <td>${o.customer?.name || o.userEmail || "—"}</td>
      <td>${formatPrice(o.total)}</td>
      <td>${o.payment === "pix" ? "PIX" : "Cartão"}</td>
      <td><span class="badge badge--${o.status === "paid" ? "promo" : "urgent"}">${o.status}</span></td>
      <td>
        <select class="admin-select" data-order-status="${o.orderId || o.id}">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`
    )
    .join("");
}

async function renderProducts() {
  const products = await api.getProducts();
  const tbody = document.querySelector("#products-table tbody");

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum produto cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map((p) => {
      const price = p.variants?.[p.defaultVariant ?? 0]?.price ?? 0;
      return `
    <tr data-product-id="${p.id}">
      <td>
        <div class="admin-product-cell">
          <img src="${p.image}" alt="" class="admin-product-thumb">
          <strong>${p.name}</strong>
        </div>
      </td>
      <td>${p.brand}</td>
      <td>${p.category}</td>
      <td>${formatPrice(price)}</td>
      <td>${p.soldOut ? '<span class="badge badge--sold-out">Esgotado</span>' : '<span class="badge badge--promo">Ativo</span>'}</td>
      <td class="admin-actions-cell">
        <button class="btn btn--sm btn--outline" data-edit-product="${p.id}">Editar</button>
        <button class="btn btn--sm btn--danger" data-delete-product="${p.id}">Excluir</button>
      </td>
    </tr>`;
    })
    .join("");
}

const COUPON_TYPE_LABELS = { percent: "Percentual", free_shipping: "Frete Grátis" };

function openCouponModal(coupon = null) {
  const modal = document.getElementById("coupon-modal");
  const form = document.getElementById("coupon-form");
  const title = document.getElementById("coupon-modal-title");
  const msg = document.getElementById("coupon-form-message");

  form.reset();
  msg.textContent = "";
  form.active.checked = true;

  if (coupon) {
    title.textContent = "Editar Cupom";
    form.editCode.value = coupon.code;
    form.code.value = coupon.code;
    form.type.value = coupon.type;
    form.value.value = coupon.value ?? 0;
    form.minOrder.value = coupon.minOrder ?? 0;
    form.description.value = coupon.description || "";
    form.firstPurchaseOnly.checked = !!coupon.firstPurchaseOnly;
    form.active.checked = coupon.active !== false;
  } else {
    title.textContent = "Novo Cupom";
    form.editCode.value = "";
  }

  toggleCouponValueField(form.type.value);
  modal.classList.add("modal-overlay--open");
}

function closeCouponModal() {
  document.getElementById("coupon-modal")?.classList.remove("modal-overlay--open");
}

function toggleCouponValueField(type) {
  const field = document.getElementById("coupon-value-field");
  if (field) field.style.display = type === "free_shipping" ? "none" : "";
}

function buildCouponFromForm(form) {
  const type = form.type.value;
  return {
    code: form.code.value.trim().toUpperCase(),
    type,
    value: type === "free_shipping" ? 0 : parseFloat(form.value.value) || 0,
    minOrder: parseFloat(form.minOrder.value) || 0,
    description: form.description.value.trim(),
    firstPurchaseOnly: form.firstPurchaseOnly.checked,
    active: form.active.checked,
  };
}

async function renderBannerForm() {
  const promos = await api.getPromotions();
  if (!promos) return;

  const form = document.getElementById("banner-form");
  form.freeShippingThreshold.value = promos.freeShippingThreshold ?? 199;
  form.pixDiscountPercent.value = promos.pixDiscountPercent ?? 5;

  const container = document.getElementById("banner-fields");
  const banners = promos.banners || [];
  const slots = [0, 1, 2].map((i) => banners[i] || { highlight: "", text: "" });

  container.innerHTML = slots
    .map(
      (b, i) => `
    <div class="banner-field-row">
      <label class="form-field">
        <span>Destaque ${i + 1}</span>
        <input type="text" name="bannerHighlight_${i}" value="${b.highlight || ""}" placeholder="Ex: Frete Grátis">
      </label>
      <label class="form-field">
        <span>Texto ${i + 1}</span>
        <input type="text" name="bannerText_${i}" value="${b.text || ""}" placeholder="Ex: acima de R$199">
      </label>
    </div>`
    )
    .join("");
}

async function renderCoupons() {
  const coupons = await api.getCoupons();
  const tbody = document.querySelector("#coupons-table tbody");

  if (!coupons.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum cupom cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = coupons
    .map(
      (c) => `
    <tr>
      <td><strong>${c.code}</strong><br><small>${c.description || ""}</small></td>
      <td>${COUPON_TYPE_LABELS[c.type] || c.type}</td>
      <td>${c.type === "percent" ? `${c.value}%` : "—"}</td>
      <td>${c.minOrder > 0 ? formatPrice(c.minOrder) : "—"}</td>
      <td>${c.active === false ? '<span class="badge badge--sold-out">Inativo</span>' : '<span class="badge badge--promo">Ativo</span>'}${c.firstPurchaseOnly ? ' <span class="badge badge--urgent">1ª compra</span>' : ""}</td>
      <td class="admin-actions-cell">
        <button class="btn btn--sm btn--outline" data-edit-coupon="${c.code}">Editar</button>
        <button class="btn btn--sm btn--danger" data-delete-coupon="${c.code}">Excluir</button>
      </td>
    </tr>`
    )
    .join("");
}

async function renderPromotions() {
  await renderBannerForm();
  await renderCoupons();
}

async function refreshAll() {
  api.invalidateCache();
  await renderStats();
  await renderOrders();
  await renderProducts();
  await renderPromotions();
}

function showAdminPanel() {
  document.getElementById("admin-denied").style.display = "none";
  document.getElementById("admin-panel").style.display = "";
  document.getElementById("current-provider").textContent = CONFIG.provider;
}

function showDenied(message) {
  document.getElementById("admin-panel").style.display = "none";
  const denied = document.getElementById("admin-denied");
  denied.style.display = "";
  if (message) {
    const p = denied.querySelector("p");
    if (p) p.textContent = message;
  }
}

function bindTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("admin-tab--active"));
      tab.classList.add("admin-tab--active");
      document.querySelectorAll(".admin-panel").forEach((p) => (p.style.display = "none"));
      document.getElementById(`panel-${tab.dataset.panel}`).style.display = "";
    });
  });
}

function bindActions() {
  document.getElementById("btn-new-product")?.addEventListener("click", () => openProductModal());

  document.getElementById("product-type")?.addEventListener("change", (e) => {
    populateSubcategories(e.target.value);
    toggleVariantFields(e.target.value);
  });

  document.querySelectorAll("[data-close-product-modal]").forEach((btn) => {
    btn.addEventListener("click", closeProductModal);
  });

  document.getElementById("product-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  document.getElementById("product-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("product-form-message");
    const submitBtn = form.querySelector('[type="submit"]');

    try {
      const product = buildProductFromForm(form);
      const editId = form.editId.value;

      if (!product.variants.some((v) => v.price > 0)) {
        msg.textContent = "Informe ao menos um preço.";
        msg.className = "auth-message auth-message--error";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Salvando...";

      let result;
      if (editId) {
        const existing = await api.getProduct(editId);
        if (existing?.badges?.length) product.badges = existing.badges;
        if (existing?.slug) product.slug = existing.slug;
        result = await api.updateProduct(editId, product);
      } else {
        result = await api.createProduct(product);
      }

      if (result?.success) {
        closeProductModal();
        await refreshAll();
      } else {
        msg.textContent = result?.message || "Erro ao salvar produto.";
        msg.className = "auth-message auth-message--error";
      }
    } catch (err) {
      msg.textContent = err.message || "Erro inesperado ao salvar.";
      msg.className = "auth-message auth-message--error";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Salvar Produto";
    }
  });

  document.querySelector("#orders-table")?.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-order-status]");
    if (!select) return;

    if (CONFIG.provider === "api") {
      try {
        await fetch(`${CONFIG.apiBaseUrl}/admin/orders/${select.dataset.orderStatus}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.getToken()}`,
          },
          body: JSON.stringify({ status: select.value }),
        });
      } catch {
        alert("Erro ao atualizar status.");
      }
    }
  });

  document.querySelector("#products-table")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-product]");
    const deleteBtn = e.target.closest("[data-delete-product]");

    if (editBtn) {
      const product = await api.getProduct(editBtn.dataset.editProduct);
      if (product) openProductModal(product);
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteProduct;
      const products = await api.getProducts();
      const product = products.find((p) => p.id === id);
      const name = product?.name || id;

      if (!confirm(`Excluir o produto "${name}"? Esta ação não pode ser desfeita.`)) return;

      const result = await api.deleteProduct(id);
      if (result?.success) {
        await refreshAll();
      } else {
        alert(result?.message || "Erro ao excluir produto.");
      }
    }
  });

  document.getElementById("btn-new-coupon")?.addEventListener("click", () => openCouponModal());

  document.getElementById("coupon-type")?.addEventListener("change", (e) => {
    toggleCouponValueField(e.target.value);
  });

  document.querySelectorAll("[data-close-coupon-modal]").forEach((btn) => {
    btn.addEventListener("click", closeCouponModal);
  });

  document.getElementById("coupon-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCouponModal();
  });

  document.getElementById("coupon-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("coupon-form-message");
    const submitBtn = form.querySelector('[type="submit"]');
    const coupon = buildCouponFromForm(form);
    const editCode = form.editCode.value;

    try {
      submitBtn.disabled = true;
      let result;
      if (editCode) {
        result = await api.updateCoupon(editCode, coupon);
      } else {
        result = await api.createCoupon(coupon);
      }

      if (result?.success) {
        closeCouponModal();
        await renderPromotions();
      } else {
        msg.textContent = result?.message || "Erro ao salvar cupom.";
        msg.className = "auth-message auth-message--error";
      }
    } catch (err) {
      msg.textContent = err.message || "Erro ao salvar cupom.";
      msg.className = "auth-message auth-message--error";
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById("banner-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("banner-form-message");

    const banners = [0, 1, 2].map((i) => ({
      highlight: form[`bannerHighlight_${i}`]?.value.trim() || "",
      text: form[`bannerText_${i}`]?.value.trim() || "",
    })).filter((b) => b.highlight || b.text);

    const data = {
      freeShippingThreshold: parseFloat(form.freeShippingThreshold.value) || 199,
      pixDiscountPercent: parseFloat(form.pixDiscountPercent.value) || 5,
      banners,
    };

    try {
      const result = await api.savePromotions(data);
      if (result?.success) {
        msg.textContent = "Banner salvo! Atualize a loja para ver as mudanças.";
        msg.className = "auth-message auth-message--success";
        api.invalidateCache();
      } else {
        msg.textContent = "Erro ao salvar banner.";
        msg.className = "auth-message auth-message--error";
      }
    } catch (err) {
      msg.textContent = err.message || "Erro ao salvar banner.";
      msg.className = "auth-message auth-message--error";
    }
  });

  document.querySelector("#coupons-table")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-coupon]");
    const deleteBtn = e.target.closest("[data-delete-coupon]");

    if (editBtn) {
      const coupons = await api.getCoupons();
      const coupon = coupons.find((c) => c.code === editBtn.dataset.editCoupon);
      if (coupon) openCouponModal(coupon);
      return;
    }

    if (deleteBtn) {
      const code = deleteBtn.dataset.deleteCoupon;
      if (!confirm(`Excluir o cupom "${code}"?`)) return;

      const result = await api.deleteCoupon(code);
      if (result?.success) {
        await renderPromotions();
      } else {
        alert(result?.message || "Erro ao excluir cupom.");
      }
    }
  });
}

async function init() {
  initApp();

  if (!auth.isAdmin()) {
    showDenied("Acesso restrito. Faça login como administrador em Minha Conta.");
    return;
  }

  showAdminPanel();
  populateSubcategories("perfumes");

  try {
    await refreshAll();
    bindTabs();
    bindActions();
  } catch (err) {
    console.error("Admin init error:", err);
    alert(`Erro ao carregar painel: ${err.message}\n\nVerifique se está usando um servidor local (http://localhost), não abrindo o arquivo direto.`);
  }

  window.addEventListener("auth:changed", () => {
    if (!auth.isAdmin()) showDenied("Sessão expirada. Faça login novamente.");
  });
}

init();
