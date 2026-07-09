export const SESSION_COOKIE = "lovel_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const ADMIN_TOKEN_KEY = "lovel:admin-token";

export const PIX_DISCOUNT = 0.05;
export const FREE_SHIPPING_THRESHOLD = 199;
export const SHIPPING_FLAT = 19.9;
export const CROSS_SELL_DISCOUNT = 0.1;
export const FRACTIONAL_LABELS = ["4ml", "10ml", "30g", "50g"];
export const FULL_BOTTLE_LABEL = "Frasco Inteiro";

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
} as const;

export const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Boas-vindas",
    subject: "Bem-vinda à LOVEL Boutique",
    body: "Olá {{name}},\n\nSeja bem-vinda à LOVEL — sua boutique de essências e cuidados premium.\n\nExplore nossa coleção de perfumes, cabelos e skincare selecionados.\n\nCom carinho,\nEquipe LOVEL",
  },
  {
    id: "order_pending",
    name: "Pedido recebido",
    subject: "Pedido {{orderId}} recebido — LOVEL",
    body: "Olá {{name}},\n\nRecebemos seu pedido {{orderId}} no valor de {{total}}.\n\nAguardamos a confirmação do pagamento para iniciar a separação.\n\nEquipe LOVEL",
  },
  {
    id: "order_paid",
    name: "Pagamento confirmado",
    subject: "Pagamento confirmado — pedido {{orderId}}",
    body: "Olá {{name}},\n\nSeu pagamento do pedido {{orderId}} foi confirmado!\n\nEm breve você receberá o código de rastreio.\n\nEquipe LOVEL",
  },
  {
    id: "promo_primeira",
    name: "Cupom primeira compra",
    subject: "10% OFF na sua primeira compra — LOVEL",
    body: "Olá {{name}},\n\nUse o cupom PRIMEIRACOMPRA e ganhe 10% de desconto na sua primeira compra.\n\nFrete grátis acima de R$199 e 5% OFF no PIX.\n\nEquipe LOVEL",
  },
] as const;
