import type { Product } from "@/lib/types";

export type ProductReview = {
  author: string;
  city: string;
  rating: number;
  text: string;
  daysAgo: number;
};

export type ProductSocialProof = {
  rating: number;
  reviewCount: number;
  stockLeft: number;
  viewers: number;
  soldThisWeek: number;
  reviews: ProductReview[];
  showFlashOffer: boolean;
  offerPercent: number;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(pool: T[], seed: number, count: number): T[] {
  const out: T[] = [];
  let s = seed;
  const used = new Set<number>();
  while (out.length < count && out.length < pool.length) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const idx = s % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
}

const PERFUME_REVIEWS: Omit<ProductReview, "daysAgo" | "rating">[] = [
  {
    author: "Camila R.",
    city: "São Paulo",
    text: "Cheiro idêntico ao original. Comprei o decant pra testar e já pedi o frasco inteiro.",
  },
  {
    author: "Larissa M.",
    city: "Belo Horizonte",
    text: "Embalagem caprichada, atomizador ótimo e chegou em 3 dias. Vou repetir.",
  },
  {
    author: "Beatriz S.",
    city: "Rio de Janeiro",
    text: "Fixação longeva no meu clima. Finalmente achei quem vende decant de qualidade.",
  },
  {
    author: "Fernanda O.",
    city: "Curitiba",
    text: "Comparando com o frasco da loja: mesma projeção. Atendimento respondeu rápido no WhatsApp.",
  },
  {
    author: "Juliana P.",
    city: "Brasília",
    text: "Comprei pra presente — a caixinha ficou tão elegante que nem precisei embrulhar.",
  },
  {
    author: "Marina C.",
    city: "Porto Alegre",
    text: "Segunda compra. Os frascos menores valem muito pra montar um wardrobe de perfumes.",
  },
  {
    author: "Patricia L.",
    city: "Salvador",
    text: "Amostra chegou lacrada e com validade ok. Nota 10 na confiança.",
  },
  {
    author: "Amanda V.",
    city: "Florianópolis",
    text: "Senti o perfume exatamente como na reseña. Já indiquei pras amigas.",
  },
];

const HAIR_REVIEWS: Omit<ProductReview, "daysAgo" | "rating">[] = [
  {
    author: "Renata A.",
    city: "São Paulo",
    text: "Fracionar máscara cara salvou meu bolso. Resultado igual ao pote cheio.",
  },
  {
    author: "Gabriela N.",
    city: "Campinas",
    text: "O cabelo ficou macio na primeira aplicação. Embalagem prática pra viagem.",
  },
  {
    author: "Sofia T.",
    city: "Recife",
    text: "Comprei pra testar antes do investimento grande — acertei em cheio.",
  },
];

const SKIN_REVIEWS: Omit<ProductReview, "daysAgo" | "rating">[] = [
  {
    author: "Helena D.",
    city: "São Paulo",
    text: "Produto importado autenticado. Pele sem oleosidade depois de uma semana.",
  },
  {
    author: "Isabela F.",
    city: "Niterói",
    text: "Embalagem intacta e validade longa. Já virou rotina de manhã.",
  },
  {
    author: "Carolina M.",
    city: "Goiânia",
    text: "Chegou rápido e bem embalado. Vou montar o kit completo aqui.",
  },
];

function reviewPool(type: string, subcategory: string) {
  const t = `${type} ${subcategory}`.toLowerCase();
  if (t.includes("cabelo") || t.includes("hair") || t.includes("mascara") || t.includes("shampoo")) {
    return HAIR_REVIEWS;
  }
  if (t.includes("skin") || t.includes("serum") || t.includes("protetor") || t.includes("rosto")) {
    return SKIN_REVIEWS;
  }
  return PERFUME_REVIEWS;
}

/** Próxima meia-noite em America/Sao_Paulo. */
export function getFlashOfferEndsAt(now = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(now); // YYYY-MM-DD
  // 03:00 UTC do dia seguinte = 00:00 BRT amanhã
  const noonUtc = new Date(`${today}T15:00:00.000Z`);
  noonUtc.setUTCDate(noonUtc.getUTCDate() + 1);
  const next = fmt.format(noonUtc);
  return new Date(`${next}T03:00:00.000Z`);
}

export function formatReviewDate(daysAgo: number): string {
  if (daysAgo <= 0) return "hoje";
  if (daysAgo === 1) return "ontem";
  if (daysAgo < 7) return `há ${daysAgo} dias`;
  if (daysAgo < 30) {
    const w = Math.round(daysAgo / 7);
    return w === 1 ? "há 1 semana" : `há ${w} semanas`;
  }
  const m = Math.round(daysAgo / 30);
  return m === 1 ? "há 1 mês" : `há ${m} meses`;
}

export function getProductSocialProof(product: Product): ProductSocialProof {
  const seed = hashString(product.slug || product.id);
  const hasDiscount = product.variants.some((v) => v.oldPrice && v.oldPrice > v.price);

  const rating = 4.7 + ((seed % 30) / 100); // 4.70 – 4.99
  const reviewCount = 48 + (seed % 180);
  const stockLeft = 3 + (seed % 9); // 3 – 11
  const viewers = 4 + (seed % 14);
  const soldThisWeek = 12 + (seed % 40);
  const offerPercent = hasDiscount
    ? Math.max(
        5,
        Math.round(
          ((Math.max(...product.variants.map((v) => v.oldPrice ?? v.price)) -
            Math.min(...product.variants.map((v) => v.price))) /
            Math.max(...product.variants.map((v) => v.oldPrice ?? v.price))) *
            100,
        ),
      )
    : 8 + (seed % 5);

  const pool = reviewPool(product.type, product.subcategory);
  const base = pick(pool, seed, 4);
  const reviews: ProductReview[] = base.map((r, i) => ({
    ...r,
    rating: i === 0 ? 5 : 4 + ((seed >> (i * 3)) % 2),
    daysAgo: 1 + ((seed >> (i * 4)) % 28),
  }));

  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    stockLeft,
    viewers,
    soldThisWeek,
    reviews,
    showFlashOffer: hasDiscount || product.featured === true || product.isLaunch === true,
    offerPercent,
  };
}

export const SOCIAL_PURCHASES = [
  { name: "Ana Clara", city: "São Paulo", product: "decant YSL Black Opium" },
  { name: "Mariana", city: "Curitiba", product: "Lattafa Khamrah 10ml" },
  { name: "Letícia", city: "Belo Horizonte", product: "Dior Sauvage Elixir" },
  { name: "Paula", city: "Rio de Janeiro", product: "Creed Aventus 4ml" },
  { name: "Bruna", city: "Porto Alegre", product: "kit skincare" },
  { name: "Isadora", city: "Brasília", product: "máscara Kérastase" },
  { name: "Helena", city: "Campinas", product: "Amouage Interlude" },
  { name: "Vitória", city: "Salvador", product: "Xerjoff Naxos 10ml" },
];
