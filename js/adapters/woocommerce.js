import { CONFIG } from "../config.js";

function getAuthParams() {
  const { storeUrl, consumerKey, consumerSecret } = CONFIG.woocommerce;
  if (!consumerKey || !consumerSecret) {
    throw new Error("Configure consumerKey e consumerSecret em js/config.js");
  }
  return `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
}

function mapWooProduct(p) {
  const variants = p.type === "variable" && p.variations?.length
    ? p.variations.map((v) => ({
        label: v.attributes?.[0]?.option || "Variante",
        price: parseFloat(v.price || p.price),
        sku: String(v.id),
      }))
    : [{ label: "Frasco Inteiro", price: parseFloat(p.price), sku: String(p.id) }];

  const categories = p.categories?.map((c) => c.slug) || [];
  let type = "perfumes";
  if (categories.some((c) => c.includes("cabelo") || c.includes("hair"))) type = "cabelos";
  if (categories.some((c) => c.includes("skin") || c.includes("face"))) type = "skincare";

  return {
    id: String(p.id),
    slug: p.slug,
    brand: p.brands?.[0]?.name || "Importado",
    name: p.name,
    type,
    subcategory: categories[0] || "grifes",
    category: p.categories?.[0]?.name || "Importado",
    image: p.images?.[0]?.src || "",
    images: (p.images || []).map((i) => i.src),
    description: p.description?.replace(/<[^>]+>/g, "") || "",
    badges: p.on_sale ? [{ type: "promo", text: "Promoção" }] : [],
    variants,
    defaultVariant: 0,
    singleVariant: variants.length <= 1,
    soldOut: p.stock_status === "outofstock",
    _source: "woocommerce",
  };
}

async function wooFetch(endpoint, options = {}) {
  const { storeUrl } = CONFIG.woocommerce;
  const auth = getAuthParams();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${storeUrl}/wp-json/wc/v3/${endpoint}${separator}${auth}`;

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body,
  });

  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
  return res.json();
}

export async function wooGetProducts(filters = {}) {
  let endpoint = "products?per_page=50&status=publish";
  if (filters.tipo) {
    const catMap = { perfumes: "perfumes", cabelos: "cabelos", skincare: "skincare" };
    if (catMap[filters.tipo]) endpoint += `&category=${catMap[filters.tipo]}`;
  }

  const products = await wooFetch(endpoint);
  let mapped = products.map(mapWooProduct);

  if (filters.sub) mapped = mapped.filter((p) => p.subcategory === filters.sub);
  if (filters.launch) mapped = mapped.filter((p) => p.isLaunch);
  return mapped;
}

export async function wooGetProduct(id) {
  try {
    const p = await wooFetch(`products/${id}`);
    return mapWooProduct(p);
  } catch {
    const products = await wooGetProducts();
    return products.find((p) => p.id === id || p.slug === id) ?? null;
  }
}

export async function wooCreateOrder(order) {
  const lineItems = order.items.map((item) => ({
    product_id: parseInt(item.productId.replace(/\D/g, ""), 10) || item.productId,
    quantity: item.quantity,
  }));

  const wooOrder = await wooFetch("orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_method: order.payment === "pix" ? "pix" : "stripe",
      payment_method_title: order.payment === "pix" ? "PIX" : "Cartão",
      set_paid: false,
      billing: {
        first_name: order.customer.name.split(" ")[0],
        last_name: order.customer.name.split(" ").slice(1).join(" ") || "-",
        email: order.customer.email,
        phone: order.customer.phone,
      },
      line_items: lineItems,
      coupon_lines: order.coupon ? [{ code: order.coupon }] : [],
    }),
  });

  return {
    success: true,
    orderId: `WC-${wooOrder.id}`,
    message: "Pedido criado no WooCommerce!",
  };
}
