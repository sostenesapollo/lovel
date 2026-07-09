export const CONFIG = {
  /** Provider: 'mock' | 'api' | 'shopify' | 'woocommerce */
  provider: "mock",

  apiBaseUrl: "http://localhost:3001/api",

  shopify: {
    storeDomain: "lovel.myshopify.com",
    storefrontToken: "",
    apiVersion: "2024-01",
  },

  woocommerce: {
    storeUrl: "https://lovel.com.br",
    consumerKey: "",
    consumerSecret: "",
  },

  pixDiscount: 0.05,
  freeShippingThreshold: 199,
  crossSellDiscount: 0.10,
  fractionalLabels: ["4ml", "10ml", "30g", "50g"],
  fullBottleLabel: "Frasco Inteiro",
};

export const CATEGORIES = {
  perfumes: {
    title: "Perfumes",
    subtitle: "Decants & Frascos Inteiros",
    subcategories: [
      { slug: "arabes", label: "Árabes" },
      { slug: "grifes", label: "Grifes" },
      { slug: "nicho", label: "Nicho" },
    ],
  },
  cabelos: {
    title: "Cabelos",
    subtitle: "Fracionados & Inteiros",
    subcategories: [
      { slug: "tratamento", label: "Tratamento" },
      { slug: "mascaras", label: "Máscaras" },
      { slug: "oleos", label: "Óleos" },
      { slug: "shampoos", label: "Shampoos" },
    ],
  },
  skincare: {
    title: "Skincare",
    subtitle: "Rotina Facial Importada",
    subcategories: [
      { slug: "serum", label: "Séruns" },
      { slug: "protetor", label: "Protetores" },
      { slug: "hidratante", label: "Hidratantes" },
    ],
  },
};
