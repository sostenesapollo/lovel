import { CONFIG } from "./config.js";
import { shopifyGetProducts, shopifyGetProduct, shopifyCreateCheckout } from "./adapters/shopify.js";
import { wooGetProducts, wooGetProduct, wooCreateOrder } from "./adapters/woocommerce.js";
import { auth } from "./auth.js";

let cache = { products: null, coupons: null, promotions: null };

const ADMIN_CATALOG_KEY = "lovel_admin_catalog";
const ADMIN_COUPONS_KEY = "lovel_admin_coupons";
const ADMIN_PROMOTIONS_KEY = "lovel_admin_promotions";

async function loadBaseCoupons() {
  const res = await fetch("data/coupons.json");
  return res.json();
}

async function getMockCoupons() {
  try {
    const stored = localStorage.getItem(ADMIN_COUPONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return loadBaseCoupons();
}

function saveMockCoupons(coupons) {
  localStorage.setItem(ADMIN_COUPONS_KEY, JSON.stringify(coupons));
  cache.coupons = coupons;
}

async function loadBasePromotions() {
  const res = await fetch("data/promotions.json");
  return res.json();
}

async function getMockPromotions() {
  try {
    const stored = localStorage.getItem(ADMIN_PROMOTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return loadBasePromotions();
}

function saveMockPromotions(promotions) {
  localStorage.setItem(ADMIN_PROMOTIONS_KEY, JSON.stringify(promotions));
  cache.promotions = promotions;
}

async function mockFetchCoupons() {
  if (!cache.coupons) {
    cache.coupons = await getMockCoupons();
  }
  return cache.coupons;
}

async function loadBaseProducts() {
  const res = await fetch("data/products.json");
  return res.json();
}

async function getMockCatalog() {
  try {
    const stored = localStorage.getItem(ADMIN_CATALOG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return loadBaseProducts();
}

function saveMockCatalog(products) {
  localStorage.setItem(ADMIN_CATALOG_KEY, JSON.stringify(products));
  cache.products = products;
}

async function mockFetchProducts() {
  if (!cache.products) {
    cache.products = await getMockCatalog();
  }
  return cache.products;
}

async function mockFetchProduct(id) {
  const products = await mockFetchProducts();
  return products.find((p) => p.id === id || p.slug === id) ?? null;
}

async function mockValidateCoupon(code, orderTotal = 0) {
  const coupons = await mockFetchCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active !== false);
  if (!coupon) return { valid: false, message: "Cupom inválido ou expirado." };
  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return { valid: false, message: `Pedido mínimo de R$ ${coupon.minOrder.toFixed(2)} para este cupom.` };
  }
  return { valid: true, coupon };
}

function authHeaders() {
  const token = auth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}

function filterProducts(promise, filters = {}) {
  return promise.then((products) => {
    let result = [...products];
    if (filters.tipo) result = result.filter((p) => p.type === filters.tipo);
    if (filters.sub) result = result.filter((p) => p.subcategory === filters.sub);
    if (filters.launch) result = result.filter((p) => p.isLaunch);
    if (filters.featured) result = result.filter((p) => p.featured);
    return result;
  });
}

function generateMockPixCode(total) {
  const key = "lovel@pagamentos.com.br";
  return `00020126580014BR.GOV.BCB.PIX0136${key}52040000530398654${String(Math.round(total * 100)).padStart(4, "0")}5802BR5925LOVEL PERFUMARIA LTDA6009SAO PAULO62070503***6304ABCD`;
}

async function shopifyGetProductsSafe(filters) {
  try {
    if (!CONFIG.shopify.storefrontToken) {
      console.warn("Shopify: configure storefrontToken em js/config.js — usando dados locais");
      return filterProducts(mockFetchProducts(), filters);
    }
    const products = await shopifyGetProducts();
    return filterProducts(Promise.resolve(products), filters);
  } catch (err) {
    console.error("Shopify error:", err.message);
    return filterProducts(mockFetchProducts(), filters);
  }
}

async function wooGetProductsSafe(filters) {
  try {
    if (!CONFIG.woocommerce.consumerKey) {
      console.warn("WooCommerce: configure credenciais em js/config.js — usando dados locais");
      return filterProducts(mockFetchProducts(), filters);
    }
    return wooGetProducts(filters);
  } catch (err) {
    console.error("WooCommerce error:", err.message);
    return filterProducts(mockFetchProducts(), filters);
  }
}

const adapters = {
  mock: {
    getProducts: (filters) => filterProducts(mockFetchProducts(), filters),
    getProduct: mockFetchProduct,
    validateCoupon: mockValidateCoupon,
    createOrder: async (order) => ({
      success: true,
      orderId: `LVL-${Date.now()}`,
      pixCode: order.payment === "pix" ? generateMockPixCode(order.total) : null,
      message: "Pedido criado com sucesso!",
    }),
    getOrders: async () => auth.getOrders(),
    createProduct: async (product) => {
      const products = [...(await getMockCatalog())];
      if (products.some((p) => p.id === product.id)) {
        return { success: false, message: "ID já existe." };
      }
      products.push(product);
      saveMockCatalog(products);
      return { success: true, product };
    },
    updateProduct: async (id, data) => {
      const products = [...(await getMockCatalog())];
      const idx = products.findIndex((p) => p.id === id);
      if (idx < 0) return { success: false, message: "Produto não encontrado." };
      products[idx] = { ...products[idx], ...data, id };
      saveMockCatalog(products);
      return { success: true, product: products[idx] };
    },
    deleteProduct: async (id) => {
      const products = [...(await getMockCatalog())];
      const filtered = products.filter((p) => p.id !== id);
      if (filtered.length === products.length) {
        return { success: false, message: "Produto não encontrado." };
      }
      saveMockCatalog(filtered);
      return { success: true };
    },
    getStats: async () => ({
      orders: auth.getOrders().length,
      products: (await mockFetchProducts()).length,
      coupons: (await mockFetchCoupons()).length,
      users: 2,
      revenue: auth.getOrders().reduce((s, o) => s + (o.total || 0), 0),
    }),
    getCoupons: () => mockFetchCoupons(),
    createCoupon: async (coupon) => {
      const coupons = [...(await getMockCoupons())];
      const code = coupon.code.toUpperCase();
      if (coupons.some((c) => c.code.toUpperCase() === code)) {
        return { success: false, message: "Código já existe." };
      }
      coupons.push({ ...coupon, code, active: coupon.active !== false });
      saveMockCoupons(coupons);
      return { success: true, coupon };
    },
    updateCoupon: async (code, data) => {
      const coupons = [...(await getMockCoupons())];
      const idx = coupons.findIndex((c) => c.code.toUpperCase() === code.toUpperCase());
      if (idx < 0) return { success: false, message: "Cupom não encontrado." };
      const newCode = (data.code || code).toUpperCase();
      coupons[idx] = { ...coupons[idx], ...data, code: newCode };
      saveMockCoupons(coupons);
      return { success: true, coupon: coupons[idx] };
    },
    deleteCoupon: async (code) => {
      const coupons = [...(await getMockCoupons())];
      const filtered = coupons.filter((c) => c.code.toUpperCase() !== code.toUpperCase());
      if (filtered.length === coupons.length) return { success: false, message: "Cupom não encontrado." };
      saveMockCoupons(filtered);
      return { success: true };
    },
    getPromotions: () => getMockPromotions(),
    savePromotions: async (data) => {
      saveMockPromotions(data);
      return { success: true, promotions: data };
    },
  },
  api: {
    getProducts: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      });
      const qs = params.toString();
      return apiFetch(`/products${qs ? `?${qs}` : ""}`);
    },
    getProduct: (id) => apiFetch(`/products/${id}`),
    validateCoupon: (code, total) => apiFetch("/coupons/validate", { method: "POST", body: JSON.stringify({ code, orderTotal: total }) }),
    createOrder: (order) => apiFetch("/orders", { method: "POST", body: JSON.stringify(order) }),
    getOrders: () => apiFetch("/orders/mine"),
    getAllOrders: () => apiFetch("/admin/orders"),
    createProduct: (product) => apiFetch("/admin/products", { method: "POST", body: JSON.stringify(product) }),
    updateProduct: (id, data) => apiFetch(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteProduct: (id) => apiFetch(`/admin/products/${id}`, { method: "DELETE" }),
    getStats: () => apiFetch("/admin/stats"),
    getCoupons: () => apiFetch("/admin/coupons"),
    createCoupon: (coupon) => apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(coupon) }),
    updateCoupon: (code, data) => apiFetch(`/admin/coupons/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCoupon: (code) => apiFetch(`/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE" }),
    getPromotions: () => apiFetch("/admin/promotions"),
    savePromotions: (data) => apiFetch("/admin/promotions", { method: "PUT", body: JSON.stringify(data) }),
  },
  shopify: {
    getProducts: shopifyGetProductsSafe,
    getProduct: async (id) => {
      try {
        if (!CONFIG.shopify.storefrontToken) return mockFetchProduct(id);
        return (await shopifyGetProduct(id)) ?? mockFetchProduct(id);
      } catch {
        return mockFetchProduct(id);
      }
    },
    validateCoupon: mockValidateCoupon,
    createOrder: async (order) => {
      const result = await shopifyCreateCheckout(order.items);
      if (result.redirectUrl) window.location.href = result.redirectUrl;
      return result;
    },
    getOrders: () => Promise.resolve([]),
    getAllOrders: () => Promise.resolve(auth.getOrders()),
    createProduct: (product) => adapters.mock.createProduct(product),
    updateProduct: (id, data) => adapters.mock.updateProduct(id, data),
    deleteProduct: (id) => adapters.mock.deleteProduct(id),
    getCoupons: () => adapters.mock.getCoupons(),
    createCoupon: (c) => adapters.mock.createCoupon(c),
    updateCoupon: (code, data) => adapters.mock.updateCoupon(code, data),
    deleteCoupon: (code) => adapters.mock.deleteCoupon(code),
    getPromotions: () => adapters.mock.getPromotions(),
    savePromotions: (data) => adapters.mock.savePromotions(data),
    getStats: async () => ({ orders: 0, products: (await shopifyGetProductsSafe({})).length || 0 }),
  },
  woocommerce: {
    getProducts: wooGetProductsSafe,
    getProduct: async (id) => {
      try {
        if (!CONFIG.woocommerce.consumerKey) return mockFetchProduct(id);
        return (await wooGetProduct(id)) ?? mockFetchProduct(id);
      } catch {
        return mockFetchProduct(id);
      }
    },
    validateCoupon: mockValidateCoupon,
    createOrder: async (order) => {
      try {
        if (!CONFIG.woocommerce.consumerKey) {
          return adapters.mock.createOrder(order);
        }
        return wooCreateOrder(order);
      } catch (err) {
        return { success: false, message: err.message };
      }
    },
    getOrders: () => Promise.resolve([]),
    getAllOrders: () => Promise.resolve(auth.getOrders()),
    createProduct: (product) => adapters.mock.createProduct(product),
    updateProduct: (id, data) => adapters.mock.updateProduct(id, data),
    deleteProduct: (id) => adapters.mock.deleteProduct(id),
    getCoupons: () => adapters.mock.getCoupons(),
    createCoupon: (c) => adapters.mock.createCoupon(c),
    updateCoupon: (code, data) => adapters.mock.updateCoupon(code, data),
    deleteCoupon: (code) => adapters.mock.deleteCoupon(code),
    getPromotions: () => adapters.mock.getPromotions(),
    savePromotions: (data) => adapters.mock.savePromotions(data),
    getStats: async () => ({ orders: 0, products: (await wooGetProductsSafe({})).length || 0 }),
  },
};

function getAdapter() {
  return adapters[CONFIG.provider] ?? adapters.mock;
}

export const api = {
  getProducts: (filters = {}) => getAdapter().getProducts(filters),
  getProduct: (id) => getAdapter().getProduct(id),
  validateCoupon: (code, total) => getAdapter().validateCoupon(code, total),
  createOrder: (order) => getAdapter().createOrder(order),
  getOrders: () => getAdapter().getOrders?.() ?? Promise.resolve(auth.getOrders()),
  getAllOrders: () => getAdapter().getAllOrders?.() ?? Promise.resolve(auth.getOrders()),
  updateProduct: (id, data) => getAdapter().updateProduct?.(id, data),
  createProduct: (product) => getAdapter().createProduct?.(product),
  deleteProduct: (id) => getAdapter().deleteProduct?.(id),
  getCoupons: () => getAdapter().getCoupons?.() ?? Promise.resolve([]),
  createCoupon: (coupon) => getAdapter().createCoupon?.(coupon),
  updateCoupon: (code, data) => getAdapter().updateCoupon?.(code, data),
  deleteCoupon: (code) => getAdapter().deleteCoupon?.(code),
  getPromotions: () => getAdapter().getPromotions?.() ?? Promise.resolve(null),
  savePromotions: (data) => getAdapter().savePromotions?.(data),
  getPublicPromotions: async () => {
    if (CONFIG.provider === "api") {
      const res = await fetch(`${CONFIG.apiBaseUrl}/promotions`);
      if (!res.ok) return loadBasePromotions();
      return res.json();
    }
    return getMockPromotions();
  },
  getStats: () => getAdapter().getStats?.() ?? Promise.resolve({ orders: 0, products: 0 }),
  invalidateCache: () => { cache = { products: null, coupons: null, promotions: null }; },
};
