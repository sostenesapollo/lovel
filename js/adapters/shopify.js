import { CONFIG } from "../config.js";

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          description
          featuredImage { url }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price { amount }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

function mapShopifyProduct(node) {
  const variants = node.variants.edges.map((e) => ({
    label: e.node.title === "Default Title" ? "Frasco Inteiro" : e.node.title,
    price: parseFloat(e.node.price.amount),
    sku: e.node.id,
    disabled: !e.node.availableForSale,
  }));

  const typeMap = { Perfume: "perfumes", Haircare: "cabelos", Skincare: "skincare" };

  return {
    id: node.handle,
    slug: node.handle,
    brand: node.vendor || "Importado",
    name: node.title,
    type: typeMap[node.productType] || "perfumes",
    subcategory: "grifes",
    category: node.productType || "Importado",
    image: node.featuredImage?.url || "",
    images: node.featuredImage?.url ? [node.featuredImage.url] : [],
    description: node.description || "",
    badges: [],
    variants: variants.length ? variants : [{ label: "Frasco Inteiro", price: 0 }],
    defaultVariant: 0,
    singleVariant: variants.length <= 1,
    _source: "shopify",
  };
}

async function shopifyGraphQL(query, variables = {}) {
  const { storeDomain, storefrontToken, apiVersion } = CONFIG.shopify;

  if (!storefrontToken) {
    throw new Error("Configure storefrontToken em js/config.js");
  }

  const res = await fetch(`https://${storeDomain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Shopify GraphQL error");
  return json.data;
}

export async function shopifyGetProducts() {
  const data = await shopifyGraphQL(PRODUCTS_QUERY, { first: 50 });
  return data.products.edges.map((e) => mapShopifyProduct(e.node));
}

export async function shopifyGetProduct(id) {
  const products = await shopifyGetProducts();
  return products.find((p) => p.id === id || p.slug === id) ?? null;
}

export async function shopifyCreateCheckout(items) {
  const { storeDomain } = CONFIG.shopify;
  return {
    success: true,
    redirectUrl: `https://${storeDomain}/cart/${items.map((i) => `${i.variantSku}:${i.quantity}`).join(",")}`,
    message: "Redirecionando para checkout Shopify...",
  };
}
