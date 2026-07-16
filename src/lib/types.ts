export type ProductVariant = {
  label: string;
  price: number;
  sku: string;
  oldPrice?: number;
  disabled?: boolean;
};

export type ProductBadge = {
  type: string;
  text: string;
};

export type Product = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  /** Primeiro slug — compatível com filtros/legado */
  subcategory: string;
  /** Todas as subcategorias do produto */
  subcategories: string[];
  category: string;
  image: string;
  images: string[];
  description: string;
  notes?: { top?: string; heart?: string; base?: string };
  badges: ProductBadge[];
  variants: ProductVariant[];
  defaultVariant: number;
  featured?: boolean;
  isLaunch?: boolean;
  soldOut?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type HeroSlide = {
  src: string;
  alt: string;
  brand: string;
  name: string;
  slug: string;
  /** Menor preço exibido (preferência: decant/fracionado). */
  fromPrice: number | null;
  /** Rótulo da variante de entrada, ex.: "4ml". */
  fromLabel: string | null;
};

export type CartItem = {
  key: string;
  productId: string;
  variantIndex: number;
  quantity: number;
  price: number;
  crossSell?: boolean;
  crossSellDiscount?: boolean;
  name: string;
  brand: string;
  variantLabel: string;
  image: string;
};

export type Coupon = {
  code: string;
  type: "percent" | "free_shipping";
  value: number;
  minOrder?: number;
  firstPurchaseOnly?: boolean;
  description?: string;
};

export type OrderCustomer = {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
};

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CUSTOMER";
  status: "ACTIVE" | "REVOKED";
};
