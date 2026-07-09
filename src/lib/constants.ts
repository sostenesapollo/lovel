export const SESSION_COOKIE = "lovel_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const ADMIN_TOKEN_KEY = "lovel:admin-token";
export const ADMIN_SESSION_COOKIE = "lovel_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** Fallback local quando a URL da imagem de produto/categoria falha ou está vazia */
export const PRODUCT_PLACEHOLDER = "/product-placeholder.svg";

export const PIX_DISCOUNT = 0.05;
export const FREE_SHIPPING_THRESHOLD = 199;
/** Fallback quando o CEP ainda não foi informado (média Sudeste, origem Paraná) */
export const SHIPPING_FLAT = 29.9;
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
    id: "login_alert",
    name: "Alerta de acesso",
    subject: "Novo acesso à sua conta LOVEL",
    body: "Olá {{name}},\n\nDetectamos um novo acesso à sua conta LOVEL.\n\nSe não foi você, altere sua senha imediatamente.\n\nEquipe LOVEL",
  },
  {
    id: "register",
    name: "Conta criada",
    subject: "Conta criada — LOVEL Boutique",
    body: "Olá {{name}},\n\nSeja bem-vinda à LOVEL — sua boutique de essências e cuidados premium.\n\nExplore nossa coleção de perfumes, cabelos e skincare selecionados.\n\nCom carinho,\nEquipe LOVEL",
  },
  {
    id: "order_pending",
    name: "Pedido recebido",
    subject: "Pedido {{orderId}} recebido — LOVEL",
    body: "Olá {{name}},\n\nRecebemos seu pedido {{orderId}} no valor de {{total}}.\n\n{{pixBlock}}\n{{accountBlock}}\nAguardamos a confirmação do pagamento para iniciar a separação.\n\nEquipe LOVEL",
  },
  {
    id: "order_paid",
    name: "Pagamento confirmado",
    subject: "Pagamento confirmado — pedido {{orderId}}",
    body: "Olá {{name}},\n\nSeu pagamento do pedido {{orderId}} foi confirmado!\n\nEm breve você receberá o código de rastreio.\n\nEquipe LOVEL",
  },
  {
    id: "order_shipped",
    name: "Pedido enviado",
    subject: "Pedido {{orderId}} enviado",
    body: "Olá {{name}},\n\nSeu pedido {{orderId}} foi enviado!\n\nEm breve você receberá atualizações de rastreio.\n\nEquipe LOVEL",
  },
  {
    id: "order_delivered",
    name: "Pedido entregue",
    subject: "Pedido {{orderId}} entregue",
    body: "Olá {{name}},\n\nSeu pedido {{orderId}} foi entregue.\n\nEsperamos que você ame cada detalhe.\n\nEquipe LOVEL",
  },
  {
    id: "order_cancelled",
    name: "Pedido cancelado",
    subject: "Pedido {{orderId}} cancelado",
    body: "Olá {{name}},\n\nSeu pedido {{orderId}} foi cancelado.\n\nSe tiver dúvidas, fale conosco.\n\nEquipe LOVEL",
  },
  {
    id: "promo_primeira",
    name: "Cupom primeira compra",
    subject: "10% OFF na sua primeira compra — LOVEL",
    body: "Olá {{name}},\n\nUse o cupom PRIMEIRACOMPRA e ganhe 10% de desconto na sua primeira compra.\n\nFrete grátis acima de R$199 e 5% OFF no PIX.\n\nEquipe LOVEL",
  },
  {
    id: "set_password",
    name: "Definir senha",
    subject: "Defina sua senha para ver seus pedidos — LOVEL",
    body: "Olá {{name}},\n\nRecebemos seu pedido e criamos sua conta na LOVEL.\n\nPara acompanhar seus pedidos, defina sua senha neste link (válido por 48 horas):\n{{resetUrl}}\n\nSe você não fez este pedido, ignore este e-mail.\n\nEquipe LOVEL",
  },
  {
    id: "reset_password",
    name: "Redefinir senha",
    subject: "Redefina sua senha — LOVEL",
    body: "Olá {{name}},\n\nRecebemos um pedido para redefinir a senha da sua conta LOVEL.\n\nClique no link abaixo (válido por 48 horas):\n{{resetUrl}}\n\nSe você não solicitou, ignore este e-mail.\n\nEquipe LOVEL",
  },
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]["id"];
