"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AutocompleteSelect } from "@/components/autocomplete-select";
import { SafeImage } from "@/components/safe-image";
import { ADMIN_TOKEN_KEY, EMAIL_TEMPLATES } from "@/lib/constants";
import { adminAuthHeaders } from "@/lib/admin-auth";
import type { Product, ProductVariant, SafeUser } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type Tab =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "users"
  | "coupons"
  | "promotions"
  | "hero"
  | "store"
  | "emails";

type Stats = { orders: number; products: number; users: number; revenue: number };

type AdminUser = SafeUser & { ordersCount: number; emailsCount: number; createdAt: string };

type Order = {
  id: string;
  total: number;
  status: string;
  payment: string;
  userEmail?: string;
  createdAt: string;
  user?: { name: string; email: string };
};

type EmailLog = { id: string; userEmail: string; template: string; subject: string; sentAt: string };

type Category = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  showOnHome: boolean;
  sortOrder: number;
  variantLabels: string[];
  subcategories: Array<{ slug: string; label: string }>;
};

type CouponRow = {
  code: string;
  type: "percent" | "free_shipping";
  value: number;
  minOrder: number;
  firstPurchaseOnly: boolean;
  description?: string | null;
  active: boolean;
};

type Promotions = {
  freeShippingThreshold: number;
  pixDiscountPercent: number;
  banners: Array<{ highlight: string; text: string; code?: string }>;
};

type StoreConfig = {
  maxPriceOnly: boolean;
};

type AdminProduct = Product & { promoText?: string | null };

type ProductForm = {
  id?: string;
  brand: string;
  name: string;
  type: string;
  subcategory: string;
  category: string;
  slug: string;
  description: string;
  featured: boolean;
  isLaunch: boolean;
  soldOut: boolean;
  active: boolean;
  promoText: string;
  notesTop: string;
  notesHeart: string;
  notesBase: string;
  variants: ProductVariant[];
  defaultVariant: number;
  images: string[];
  image: string;
};

const PRODUCT_DRAFT_KEY = "admin_product_draft_id";
const DRAFT_AUTOSAVE_MS = 900;

type CategoryForm = {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  showOnHome: boolean;
  sortOrder: number;
  variantLabelsText: string;
  subcategories: Array<{ slug: string; label: string }>;
};

type CouponForm = {
  code: string;
  type: "percent" | "free_shipping";
  value: string;
  minOrder: string;
  firstPurchaseOnly: boolean;
  description: string;
  active: boolean;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Produtos" },
  { id: "categories", label: "Categorias" },
  { id: "orders", label: "Pedidos" },
  { id: "users", label: "Usuários" },
  { id: "coupons", label: "Cupons" },
  { id: "promotions", label: "Promoções" },
  { id: "hero", label: "Carrossel home" },
  { id: "store", label: "Loja" },
  { id: "emails", label: "E-mails" },
];

const HERO_MAX_SLIDES = 8;

const ORDER_STATUSES = ["pending_payment", "paid", "shipped", "delivered", "cancelled"] as const;

const PAGE_SIZE = 8;

function emptyProductForm(type = ""): ProductForm {
  return {
    brand: "",
    name: "",
    type,
    subcategory: "",
    category: "",
    slug: "",
    description: "",
    featured: false,
    isLaunch: false,
    soldOut: false,
    active: false,
    promoText: "",
    notesTop: "",
    notesHeart: "",
    notesBase: "",
    variants: [{ label: "Único", price: 0, sku: "" }],
    defaultVariant: 0,
    images: [],
    image: "",
  };
}

function productToForm(p: AdminProduct): ProductForm {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    type: p.type,
    subcategory: p.subcategory ?? "",
    category: p.category ?? "",
    slug: p.slug,
    description: p.description ?? "",
    featured: Boolean(p.featured),
    isLaunch: Boolean(p.isLaunch),
    soldOut: Boolean(p.soldOut),
    active: p.active !== false,
    promoText: p.promoText ?? "",
    notesTop: p.notes?.top ?? "",
    notesHeart: p.notes?.heart ?? "",
    notesBase: p.notes?.base ?? "",
    variants: p.variants?.length
      ? p.variants.map((v) => ({
          label: v.label,
          price: v.price,
          sku: v.sku,
          ...(v.oldPrice != null ? { oldPrice: v.oldPrice } : {}),
        }))
      : [{ label: "Único", price: 0, sku: "" }],
    defaultVariant: p.defaultVariant ?? 0,
    images: p.images?.length ? [...p.images] : p.image ? [p.image] : [],
    image: p.image ?? "",
  };
}

function buildProductPayload(form: ProductForm, opts?: { active?: boolean }) {
  return {
    brand: form.brand.trim(),
    name: form.name.trim(),
    type: form.type,
    subcategory: form.subcategory,
    category: form.category || form.type,
    slug: form.slug || undefined,
    description: form.description,
    featured: form.featured,
    isLaunch: form.isLaunch,
    soldOut: form.soldOut,
    active: opts?.active ?? form.active,
    promoText: form.promoText || null,
    notes: {
      top: form.notesTop || undefined,
      heart: form.notesHeart || undefined,
      base: form.notesBase || undefined,
    },
    variants: form.variants.map((v, i) => ({
      label: v.label,
      price: Number(v.price) || 0,
      sku: v.sku || `${form.slug || form.name}-${i + 1}`,
      ...(v.oldPrice != null && v.oldPrice !== 0 ? { oldPrice: Number(v.oldPrice) } : {}),
    })),
    defaultVariant: form.defaultVariant,
    images: form.images,
    image: form.images[0] ?? form.image ?? "",
  };
}

function emptyCategoryForm(): CategoryForm {
  return {
    slug: "",
    title: "",
    subtitle: "",
    image: "",
    showOnHome: true,
    sortOrder: 0,
    variantLabelsText: "",
    subcategories: [],
  };
}

function categoryToForm(c: Category): CategoryForm {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? "",
    image: c.image ?? "",
    showOnHome: c.showOnHome !== false,
    sortOrder: c.sortOrder ?? 0,
    variantLabelsText: (c.variantLabels ?? []).join(", "),
    subcategories: (c.subcategories ?? []).map((s) => ({ slug: s.slug, label: s.label })),
  };
}

function emptyCouponForm(): CouponForm {
  return {
    code: "",
    type: "percent",
    value: "0",
    minOrder: "0",
    firstPurchaseOnly: false,
    description: "",
    active: true,
  };
}

function priceRange(variants: ProductVariant[]) {
  if (!variants?.length) return "—";
  const prices = variants.map((v) => v.price).filter((n) => Number.isFinite(n));
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

function parseLabels(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function defaultVariantPrice(p: AdminProduct): number {
  const idx = p.defaultVariant ?? 0;
  return p.variants?.[idx]?.price ?? p.variants?.[0]?.price ?? 0;
}

function EditPencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" />
    </svg>
  );
}

function CheckActivateIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AdminPagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button type="button" className="btn btn--sm btn--outline" disabled={page === 0} onClick={onPrev}>
        Anterior
      </button>
      <span>
        Página {page + 1} de {totalPages}
      </span>
      <button type="button" className="btn btn--sm btn--outline" disabled={page >= totalPages - 1} onClick={onNext}>
        Próxima
      </button>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = token.trim();
    if (!value) {
      setError("Informe a chave de acesso.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      if (res.ok) {
        localStorage.setItem(ADMIN_TOKEN_KEY, value);
        onLogin(value);
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Chave de admin inválida.");
    } catch {
      setError("Não foi possível entrar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <Image src="/icone.jpg" alt="LOVEL" width={64} height={64} className="admin-login__icon" />
      <h1>LOVEL Admin</h1>
      <p className="admin-login__hint">Acesso restrito à equipe</p>
      <form onSubmit={submit} className="admin-login__form">
        <label className="form-field form-field--full">
          <span>Chave de acesso</span>
          <div className="admin-login__input-row">
            <input
              type={showKey ? "text" : "password"}
              placeholder="Cole a chave aqui"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
              autoFocus
              spellCheck={false}
              disabled={loading}
            />
            <button
              type="button"
              className="admin-login__toggle"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
              tabIndex={-1}
            >
              {showKey ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--gold btn--full" disabled={loading || !token.trim()}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <Link href="/" className="btn btn--link">
        ← Voltar à loja
      </Link>
    </div>
  );
}

export default function ListTablePage() {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState<Tab>("products");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [r2Configured, setR2Configured] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productDropActive, setProductDropActive] = useState(false);
  const [categoryDropActive, setCategoryDropActive] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const productDragDepth = useRef(0);
  const categoryDragDepth = useRef(0);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [promotions, setPromotions] = useState<Promotions | null>(null);
  const [bannersJson, setBannersJson] = useState("[]");
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({ maxPriceOnly: false });
  const [heroProductIds, setHeroProductIds] = useState<string[]>([]);
  const [heroPickId, setHeroPickId] = useState("");
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<{ orders: Order[]; emails: EmailLog[] } | null>(null);
  const [emailForm, setEmailForm] = useState({ email: "", templateId: "welcome" as string, orderId: "" });

  const [productModal, setProductModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm());
  const [variantLabelMode, setVariantLabelMode] = useState<"pick" | "free">("free");
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftInFlight = useRef(false);
  const draftQueued = useRef(false);
  const productFormRef = useRef(productForm);
  const skipDraftAutosave = useRef(false);

  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm());

  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm());
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: "name" | "price" } | null>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const skipInlineBlur = useRef(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const sessionRes = await fetch("/api/admin/session", { credentials: "same-origin" });
        if (sessionRes.ok) {
          const saved = localStorage.getItem(ADMIN_TOKEN_KEY);
          if (!cancelled) setToken(saved ?? "session");
          return;
        }

        const saved = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!saved) return;

        const migrate = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: saved }),
        });
        if (migrate.ok && !cancelled) {
          setToken(saved);
          return;
        }

        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } catch {
        /* keep guest */
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const headers = useCallback(() => {
    if (token && token !== "session") return adminAuthHeaders(token);
    return {} as Record<string, string>;
  }, [token]);

  const toast = useCallback((text: string) => {
    setMsg(text);
  }, []);

  const loadAll = useCallback(async () => {
    if (!token) return;
    const h = headers();
    setLoadError(false);
    try {
      const responses = await Promise.all([
        fetch("/api/admin/stats", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/users", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/orders", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/products", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/categories", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/coupons", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/promotions", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/hero", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/store-config", { headers: h, credentials: "same-origin" }),
        fetch("/api/r2/presign-upload", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/emails", { method: "PUT", headers: h, credentials: "same-origin" }),
      ]);

      if (responses.some((r) => r.status === 401)) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" }).catch(() => null);
        setToken(null);
        setLoadError(false);
        toast("Sessão expirada. Entre novamente.");
        return;
      }

      if (responses.some((r) => !r.ok)) {
        setLoadError(true);
        toast("Falha ao carregar dados do admin.");
        return;
      }

      const [s, u, o, p, cats, coups, promo, hero, store, r2, logs] = await Promise.all(
        responses.map((r) => r.json()),
      );
      setStats(s);
      setUsers(Array.isArray(u) ? u : []);
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setCoupons(Array.isArray(coups) ? coups : []);
      if (promo && typeof promo === "object") {
        const next: Promotions = {
          freeShippingThreshold: Number(promo.freeShippingThreshold ?? 199),
          pixDiscountPercent: Number(promo.pixDiscountPercent ?? 5),
          banners: Array.isArray(promo.banners) ? promo.banners : [],
        };
        setPromotions(next);
        setBannersJson(JSON.stringify(next.banners, null, 2));
      }
      setHeroProductIds(Array.isArray(hero?.productIds) ? hero.productIds : []);
      setStoreConfig({ maxPriceOnly: Boolean(store?.maxPriceOnly) });
      setR2Configured(Boolean(r2?.configured));
      setEmailLogs(Array.isArray(logs) ? logs : []);
      setLoadError(false);
    } catch {
      setLoadError(true);
      toast("Falha ao carregar dados do admin.");
    }
  }, [token, headers, toast]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  useEffect(() => {
    setPage(0);
  }, [tab, productSearch, productCategoryFilter]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchesName = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchesCategory = !productCategoryFilter || p.type === productCategoryFilter;
      return matchesName && matchesCategory;
    });
  }, [products, productSearch, productCategoryFilter]);

  const tabItemCount =
    tab === "products"
      ? filteredProducts.length
      : tab === "categories"
        ? categories.length
        : tab === "orders"
          ? orders.length
          : tab === "users"
            ? users.length
            : tab === "coupons"
              ? coupons.length
              : 0;

  const totalPages = Math.max(1, Math.ceil(tabItemCount / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const pagedProducts = useMemo(
    () => filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredProducts, page],
  );
  const pagedCategories = useMemo(
    () => categories.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [categories, page],
  );
  const pagedOrders = useMemo(
    () => orders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [orders, page],
  );
  const pagedUsers = useMemo(
    () => users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [users, page],
  );
  const pagedCoupons = useMemo(
    () => coupons.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [coupons, page],
  );

  const productById = useMemo(() => {
    const map = new Map<string, AdminProduct>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const heroSlides = useMemo(
    () =>
      heroProductIds
        .map((id) => productById.get(id))
        .filter((p): p is AdminProduct => Boolean(p)),
    [heroProductIds, productById],
  );

  const heroProductOptions = useMemo(
    () =>
      products
        .filter((p) => p.image && !heroProductIds.includes(p.id))
        .map((p) => ({
          value: p.id,
          label: `${p.brand} — ${p.name}`,
        })),
    [products, heroProductIds],
  );

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.slug, c);
    return map;
  }, [categories]);

  const selectedCategory = productForm.type ? categoryBySlug.get(productForm.type) : undefined;
  const categoryVariantLabels = selectedCategory?.variantLabels ?? [];

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: `${c.title} (${c.slug})` })),
    [categories],
  );

  const subcategoryOptions = useMemo(
    () =>
      (selectedCategory?.subcategories ?? []).map((s) => ({
        value: s.slug,
        label: s.label,
      })),
    [selectedCategory],
  );

  const variantLabelOptions = useMemo(
    () => categoryVariantLabels.map((label) => ({ value: label, label })),
    [categoryVariantLabels],
  );

  async function uploadToR2(file: File): Promise<string | null> {
    if (!r2Configured) {
      toast("R2 não configurado — cole a URL manualmente.");
      return null;
    }
    setUploading(true);
    try {
      const presign = await fetch("/api/r2/presign-upload", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }).then((r) => r.json());

      if (!presign.uploadUrl || !presign.publicUrl) {
        toast(presign.message ?? "Falha no presign R2.");
        return null;
      }

      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        toast("Falha no upload R2.");
        return null;
      }
      return presign.publicUrl as string;
    } catch {
      toast("Falha no upload R2.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function loadUserDetail(id: string) {
    setSelectedUser(id);
    const res = await fetch(`/api/admin/users/${id}`, { headers: headers() });
    const data = await res.json();
    setUserDetail({ orders: data.orders ?? [], emails: data.emails ?? [] });
    setEmailForm((f) => ({ ...f, email: data.user?.email ?? f.email }));
  }

  async function revokeUser(id: string, status: "ACTIVE" | "REVOKED") {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast(status === "REVOKED" ? "Acesso revogado." : "Acesso restaurado.");
    loadAll();
  }

  async function impersonateUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "POST", headers: headers() });
    const data = await res.json();
    if (data.success) {
      toast(`Logado como ${data.user.name}. Abra /conta em outra aba.`);
      window.open("/conta", "_blank");
    } else {
      toast(data.message ?? "Erro ao impersonar.");
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast(`Pedido ${id}: status → ${status}`);
    loadAll();
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailForm.email,
        templateId: emailForm.templateId,
        orderId: emailForm.orderId || undefined,
        userId: selectedUser ?? undefined,
      }),
    });
    const data = await res.json();
    toast(data.success ? "E-mail enviado!" : (data.message ?? "Erro ao enviar."));
    loadAll();
  }

  function openNewProduct() {
    const draftId = typeof window !== "undefined" ? localStorage.getItem(PRODUCT_DRAFT_KEY) : null;
    if (draftId) {
      const draft = products.find((p) => p.id === draftId && p.active === false);
      if (draft) {
        skipDraftAutosave.current = true;
        setProductForm(productToForm(draft));
        const cat = categoryBySlug.get(draft.type);
        setVariantLabelMode(cat?.variantLabels?.length ? "pick" : "free");
        setDraftStatus("saved");
        setProductModal(true);
        return;
      }
      // Só limpa se a lista já carregou e o rascunho sumiu (publicado/excluído).
      if (products.length > 0) localStorage.removeItem(PRODUCT_DRAFT_KEY);
    }

    const firstType = categories[0]?.slug ?? "";
    const form = emptyProductForm(firstType);
    if (categories[0]) {
      form.category = categories[0].title;
      form.type = categories[0].slug;
    }
    skipDraftAutosave.current = true;
    setProductForm(form);
    setVariantLabelMode(categories[0]?.variantLabels?.length ? "pick" : "free");
    setDraftStatus("idle");
    setProductModal(true);
  }

  function openEditProduct(p: AdminProduct) {
    skipDraftAutosave.current = true;
    setProductForm(productToForm(p));
    const cat = categoryBySlug.get(p.type);
    setVariantLabelMode(cat?.variantLabels?.length ? "pick" : "free");
    setDraftStatus("idle");
    setProductModal(true);
  }

  function closeProductModal() {
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
      const form = productFormRef.current;
      if ((!form.id || !form.active) && form.brand.trim() && form.name.trim() && form.type) {
        void persistProductDraft(form);
      }
    }
    setProductModal(false);
    setDraftStatus("idle");
  }

  useEffect(() => {
    productFormRef.current = productForm;
  }, [productForm]);

  useEffect(() => {
    if (!productModal) return;
    if (skipDraftAutosave.current) {
      skipDraftAutosave.current = false;
      return;
    }
    // Autosave só em criação / rascunho desativado — produto publicado salva no botão.
    if (productForm.id && productForm.active) return;
    if (!productForm.brand.trim() || !productForm.name.trim() || !productForm.type) return;

    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      void persistProductDraft(productFormRef.current);
    }, DRAFT_AUTOSAVE_MS);

    return () => {
      if (draftTimer.current) {
        clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autosave on form edits only
  }, [productForm, productModal]);

  function wrapDescriptionBold() {
    const el = descriptionRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end) || "texto";
    const next = `${value.slice(0, start)}**${selected}**${value.slice(end)}`;
    setProductForm((f) => ({ ...f, description: next }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + 2 + selected.length;
      el.setSelectionRange(start + 2, cursor);
    });
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setProductForm((f) => {
      const variants = f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
      return { ...f, variants };
    });
  }

  function addVariantRow() {
    setProductForm((f) => {
      const label = categoryVariantLabels[0] ?? "";
      return {
        ...f,
        variants: [...f.variants, { label, price: 0, sku: "" }],
      };
    });
  }

  function removeVariantRow(index: number) {
    setProductForm((f) => {
      const variants = f.variants.filter((_, i) => i !== index);
      const defaultVariant = Math.min(f.defaultVariant, Math.max(0, variants.length - 1));
      return { ...f, variants: variants.length ? variants : [{ label: "Único", price: 0, sku: "" }], defaultVariant };
    });
  }

  async function appendProductImage(file: File) {
    const url = await uploadToR2(file);
    if (!url) return;
    setProductForm((f) => {
      const images = [...f.images, url];
      return { ...f, images, image: images[0] ?? url };
    });
  }

  async function appendProductImages(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of images) {
      await appendProductImage(file);
    }
  }

  function resetProductDrop() {
    productDragDepth.current = 0;
    setProductDropActive(false);
  }

  function resetCategoryDrop() {
    categoryDragDepth.current = 0;
    setCategoryDropActive(false);
  }

  function onProductDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (![...e.dataTransfer.types].includes("Files")) return;
    productDragDepth.current += 1;
    setProductDropActive(true);
  }

  function onProductDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    productDragDepth.current = Math.max(0, productDragDepth.current - 1);
    if (productDragDepth.current === 0) setProductDropActive(false);
  }

  function onProductDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if ([...e.dataTransfer.types].includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  async function onProductDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    resetProductDrop();
    if (uploading) return;
    const files = e.dataTransfer.files;
    if (files?.length) await appendProductImages(files);
  }

  function onCategoryDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (![...e.dataTransfer.types].includes("Files")) return;
    categoryDragDepth.current += 1;
    setCategoryDropActive(true);
  }

  function onCategoryDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    categoryDragDepth.current = Math.max(0, categoryDragDepth.current - 1);
    if (categoryDragDepth.current === 0) setCategoryDropActive(false);
  }

  function onCategoryDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if ([...e.dataTransfer.types].includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  async function onCategoryDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    resetCategoryDrop();
    if (uploading) return;
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) await appendCategoryImage(file);
  }

  function removeProductImage(index: number) {
    setProductForm((f) => {
      const images = f.images.filter((_, i) => i !== index);
      return { ...f, images, image: images[0] ?? "" };
    });
  }

  function setPrimaryImage(index: number) {
    setProductForm((f) => {
      if (index <= 0 || index >= f.images.length) return f;
      const images = [...f.images];
      const [picked] = images.splice(index, 1);
      images.unshift(picked);
      return { ...f, images, image: images[0] ?? "" };
    });
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm.brand.trim() || !productForm.name.trim() || !productForm.type) {
      toast("Marca, nome e tipo são obrigatórios.");
      return;
    }
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    setSaving(true);
    try {
      const payload = buildProductPayload(productForm, { active: true });
      const isEdit = Boolean(productForm.id);
      const res = await fetch(isEdit ? `/api/admin/products/${productForm.id}` : "/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao salvar produto.");
        return;
      }
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
      toast(isEdit ? "Produto atualizado." : "Produto publicado.");
      closeProductModal();
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function persistProductDraft(form: ProductForm) {
    if (!form.brand.trim() || !form.name.trim() || !form.type) return;
    if (draftInFlight.current) {
      draftQueued.current = true;
      return;
    }

    draftInFlight.current = true;
    setDraftStatus("saving");
    try {
      // Autosave sempre deixa desativado; publicar é só pelo botão.
      const payload = buildProductPayload(form, { active: false });
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftStatus("error");
        return;
      }

      const saved = data.product as AdminProduct | undefined;
      if (saved?.id) {
        const isDraft = saved.active === false;
        if (isDraft) localStorage.setItem(PRODUCT_DRAFT_KEY, saved.id);
        skipDraftAutosave.current = true;
        setProductForm((f) => ({
          ...f,
          id: saved.id,
          slug: f.slug || saved.slug,
          active: saved.active !== false,
        }));
        setProducts((list) => {
          const next: AdminProduct = {
            ...saved,
            active: saved.active !== false,
            promoText: saved.promoText ?? null,
          };
          const idx = list.findIndex((p) => p.id === saved.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = { ...list[idx], ...next };
            return copy;
          }
          return [next, ...list];
        });
      }
      setDraftStatus("saved");
    } catch {
      setDraftStatus("error");
    } finally {
      draftInFlight.current = false;
      if (draftQueued.current) {
        draftQueued.current = false;
        void persistProductDraft(productFormRef.current);
      }
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Excluir produto "${name}"?`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.message ?? "Erro ao excluir.");
      return;
    }
    if (localStorage.getItem(PRODUCT_DRAFT_KEY) === id) {
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
    }
    toast("Produto excluído.");
    loadAll();
  }

  async function toggleSoldOut(p: AdminProduct) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ soldOut: !p.soldOut }),
    });
    toast(p.soldOut ? "Produto ativado." : "Produto esgotado.");
    loadAll();
  }

  async function toggleProductActive(p: AdminProduct) {
    const next = p.active === false;
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (next) localStorage.removeItem(PRODUCT_DRAFT_KEY);
    else localStorage.setItem(PRODUCT_DRAFT_KEY, p.id);
    toast(next ? "Produto publicado." : "Produto desativado (rascunho).");
    loadAll();
  }

  function startInlineEdit(p: AdminProduct, field: "name" | "price") {
    if (inlineSaving) return;
    setInlineEdit({ id: p.id, field });
    setInlineValue(field === "name" ? p.name : String(defaultVariantPrice(p)));
  }

  function cancelInlineEdit() {
    if (inlineSaving) return;
    skipInlineBlur.current = true;
    setInlineEdit(null);
    setInlineValue("");
  }

  async function commitInlineEdit(p: AdminProduct) {
    if (skipInlineBlur.current) {
      skipInlineBlur.current = false;
      return;
    }
    if (!inlineEdit || inlineEdit.id !== p.id || inlineSaving) return;

    const field = inlineEdit.field;
    if (field === "name") {
      const name = inlineValue.trim();
      if (!name) {
        toast("Nome não pode ficar vazio.");
        return;
      }
      if (name === p.name) {
        cancelInlineEdit();
        return;
      }
      setInlineSaving(true);
      try {
        const res = await fetch(`/api/admin/products/${p.id}`, {
          method: "PUT",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast(data.message ?? "Erro ao atualizar nome.");
          return;
        }
        setProducts((list) => list.map((item) => (item.id === p.id ? { ...item, name } : item)));
        toast("Nome atualizado.");
        setInlineEdit(null);
        setInlineValue("");
      } finally {
        setInlineSaving(false);
      }
      return;
    }

    const price = Number(inlineValue.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      toast("Preço inválido.");
      return;
    }
    const idx = p.defaultVariant ?? 0;
    const current = defaultVariantPrice(p);
    if (price === current) {
      cancelInlineEdit();
      return;
    }
    const variants = (p.variants?.length ? p.variants : [{ label: "Único", price: 0, sku: "" }]).map(
      (v, i) => (i === idx ? { ...v, price } : v),
    );
    setInlineSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ variants }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.message ?? "Erro ao atualizar preço.");
        return;
      }
      setProducts((list) => list.map((item) => (item.id === p.id ? { ...item, variants } : item)));
      toast("Preço atualizado.");
      setInlineEdit(null);
      setInlineValue("");
    } finally {
      setInlineSaving(false);
    }
  }

  function openNewCategory() {
    setCategoryForm(emptyCategoryForm());
    setCategoryModal(true);
  }

  function openEditCategory(c: Category) {
    setCategoryForm(categoryToForm(c));
    setCategoryModal(true);
  }

  async function appendCategoryImage(file: File) {
    const url = await uploadToR2(file);
    if (!url) return;
    setCategoryForm((f) => ({ ...f, image: url }));
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryForm.slug || !categoryForm.title) {
      toast("Slug e título são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: categoryForm.slug,
        title: categoryForm.title,
        subtitle: categoryForm.subtitle,
        image: categoryForm.image,
        showOnHome: categoryForm.showOnHome,
        sortOrder: Number(categoryForm.sortOrder) || 0,
        variantLabels: parseLabels(categoryForm.variantLabelsText),
        subcategories: categoryForm.subcategories
          .filter((s) => s.slug || s.label)
          .map((s) => ({
            slug: s.slug || s.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            label: s.label || s.slug,
          })),
      };
      const isEdit = Boolean(categoryForm.id);
      const res = await fetch(isEdit ? `/api/admin/categories/${categoryForm.id}` : "/api/admin/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao salvar categoria.");
        return;
      }
      toast(isEdit ? "Categoria atualizada." : "Categoria criada.");
      setCategoryModal(false);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, title: string) {
    if (!confirm(`Excluir categoria "${title}"?`)) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.message ?? "Erro ao excluir categoria.");
      return;
    }
    toast("Categoria excluída.");
    loadAll();
  }

  async function toggleCategoryHome(c: Category) {
    await fetch(`/api/admin/categories/${c.id}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHome: !c.showOnHome }),
    });
    loadAll();
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponForm.code) {
      toast("Código obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponForm.code,
          type: couponForm.type,
          value: Number(couponForm.value) || 0,
          minOrder: Number(couponForm.minOrder) || 0,
          firstPurchaseOnly: couponForm.firstPurchaseOnly,
          description: couponForm.description || undefined,
          active: couponForm.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao criar cupom.");
        return;
      }
      toast("Cupom criado.");
      setCouponForm(emptyCouponForm());
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function savePromotions(e: React.FormEvent) {
    e.preventDefault();
    if (!promotions) return;
    let banners: Promotions["banners"];
    try {
      banners = JSON.parse(bannersJson);
      if (!Array.isArray(banners)) throw new Error("not array");
    } catch {
      toast("JSON de banners inválido.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        freeShippingThreshold: Number(promotions.freeShippingThreshold) || 0,
        pixDiscountPercent: Number(promotions.pixDiscountPercent) || 0,
        banners,
      };
      const res = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao salvar promoções.");
        return;
      }
      toast("Promoções salvas.");
      setPromotions(payload);
      setBannersJson(JSON.stringify(payload.banners, null, 2));
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function saveHeroCarousel(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productIds: heroProductIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao salvar carrossel.");
        return;
      }
      setHeroProductIds(Array.isArray(data.productIds) ? data.productIds : heroProductIds);
      toast(
        heroProductIds.length === 0
          ? "Carrossel limpo — home usa featured + lançamentos."
          : "Carrossel da home salvo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveStoreConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(storeConfig),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Erro ao salvar configuração da loja.");
        return;
      }
      if (data.config) setStoreConfig({ maxPriceOnly: Boolean(data.config.maxPriceOnly) });
      toast(
        storeConfig.maxPriceOnly
          ? "Loja: só preço máximo — fracionados e categoria do produto ocultos."
          : "Loja: fracionados e categorias do produto visíveis.",
      );
    } finally {
      setSaving(false);
    }
  }

  function addHeroProduct(id: string) {
    if (!id || heroProductIds.includes(id) || heroProductIds.length >= HERO_MAX_SLIDES) return;
    setHeroProductIds((prev) => [...prev, id]);
    setHeroPickId("");
  }

  function moveHeroProduct(index: number, dir: -1 | 1) {
    setHeroProductIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function removeHeroProduct(id: string) {
    setHeroProductIds((prev) => prev.filter((x) => x !== id));
  }

  if (!authReady) {
    return (
      <div className="admin-login admin-login--loading">
        <Image src="/icone.jpg" alt="LOVEL" width={48} height={48} className="admin-login__icon" />
        <p>Verificando sessão…</p>
      </div>
    );
  }

  if (!token) return <AdminLogin onLogin={setToken} />;

  async function logout() {
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    } catch {
      /* ignore */
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setLoadError(false);
    setMsg("");
    setToken(null);
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header__brand">
          <Image src="/icone.jpg" alt="LOVEL" width={32} height={32} />
          <span>LOVEL Admin</span>
        </div>
        <nav className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-tab${tab === t.id ? " admin-tab--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-header__actions">
          <Link href="/" className="btn btn--outline btn--sm">
            Loja
          </Link>
          <button type="button" className="btn btn--sm btn--logout" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      {msg && (
        <div className="admin-toast">
          <span>{msg}</span>
          <div className="admin-toast__actions">
            {loadError && (
              <button type="button" className="btn btn--outline btn--sm" onClick={logout}>
                Sair
              </button>
            )}
            <button type="button" onClick={() => setMsg("")} aria-label="Fechar">
              ×
            </button>
          </div>
        </div>
      )}

      <main className="admin-main container">
        {loadError && (
          <div className="admin-load-error">
            <h2>Não foi possível carregar o admin</h2>
            <p>
              Os dados não vieram do servidor. Você pode tentar de novo ou sair e entrar com outra
              chave.
            </p>
            <div className="admin-load-error__actions">
              <button type="button" className="btn btn--gold btn--sm" onClick={() => loadAll()}>
                Tentar de novo
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={logout}>
                Sair
              </button>
            </div>
          </div>
        )}

        {!loadError && (
          <>
        {tab === "dashboard" && stats && (
          <div className="admin-stats">
            <div className="admin-stat">
              <span>Pedidos</span>
              <strong>{stats.orders}</strong>
            </div>
            <div className="admin-stat">
              <span>Produtos</span>
              <strong>{stats.products}</strong>
            </div>
            <div className="admin-stat">
              <span>Usuários</span>
              <strong>{stats.users}</strong>
            </div>
            <div className="admin-stat">
              <span>Receita</span>
              <strong>{formatPrice(stats.revenue)}</strong>
            </div>
            <div className="admin-stat">
              <span>Categorias</span>
              <strong>{categories.length}</strong>
            </div>
            <div className="admin-stat">
              <span>Cupons</span>
              <strong>{coupons.length}</strong>
            </div>
            <div className="admin-stat">
              <span>R2</span>
              <strong>{r2Configured ? "OK" : "Off"}</strong>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="admin-form-footer" style={{ border: 0, marginTop: 0, paddingTop: 0, justifyContent: "space-between" }}>
              <h2 className="admin-section-title" style={{ margin: 0 }}>
                Produtos ({filteredProducts.length}
                {filteredProducts.length !== products.length ? ` de ${products.length}` : ""})
              </h2>
              <button type="button" className="btn btn--gold btn--sm" onClick={openNewProduct}>
                Novo produto
              </button>
            </div>
            <div className="admin-product-filters">
              <label className="form-field admin-product-filters__search">
                <span>Buscar</span>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar por nome ou marca…"
                />
              </label>
              <label className="form-field admin-product-filters__category">
                <span>Categoria</span>
                <AutocompleteSelect
                  value={productCategoryFilter}
                  options={categories.map((c) => ({ value: c.slug, label: c.title }))}
                  onChange={setProductCategoryFilter}
                  placeholder="Todas as categorias"
                  allowClear
                />
              </label>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-table__status-col" aria-label="Status" />
                    <th></th>
                    <th>Marca</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Preço</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((p) => {
                    const thumb = p.images?.[0] || p.image;
                    const editingName = inlineEdit?.id === p.id && inlineEdit.field === "name";
                    const editingPrice = inlineEdit?.id === p.id && inlineEdit.field === "price";
                    const isDraft = p.active === false;
                    const statusLabel = isDraft ? "Rascunho" : p.soldOut ? "Esgotado" : "Ativo";
                    return (
                      <tr key={p.id}>
                        <td className="admin-table__status-col">
                          <span
                            className={`admin-status-dot${
                              isDraft
                                ? " admin-status-dot--draft"
                                : p.soldOut
                                  ? " admin-status-dot--sold-out"
                                  : " admin-status-dot--active"
                            }`}
                            title={statusLabel}
                            aria-label={statusLabel}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-thumb-edit"
                            onClick={() => openEditProduct(p)}
                            title="Editar produto"
                            aria-label={`Editar ${p.name}`}
                          >
                            {thumb ? (
                              <SafeImage src={thumb} alt="" width={48} height={48} unoptimized style={{ objectFit: "cover" }} />
                            ) : (
                              <span className="admin-thumb-edit__empty">+</span>
                            )}
                            <span className="admin-thumb-edit__icon" aria-hidden>
                              <EditPencilIcon />
                            </span>
                          </button>
                        </td>
                        <td>{p.brand}</td>
                        <td>
                          {editingName ? (
                            <input
                              className="admin-inline-input"
                              autoFocus
                              value={inlineValue}
                              disabled={inlineSaving}
                              onChange={(e) => setInlineValue(e.target.value)}
                              onBlur={() => commitInlineEdit(p)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitInlineEdit(p);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelInlineEdit();
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="admin-inline-edit"
                              onClick={() => startInlineEdit(p, "name")}
                              title="Editar nome"
                            >
                              <span>{p.name}</span>
                              <span className="admin-inline-edit__icon" aria-hidden>
                                <EditPencilIcon />
                              </span>
                            </button>
                          )}
                        </td>
                        <td>{p.type}</td>
                        <td>
                          {editingPrice ? (
                            <input
                              className="admin-inline-input admin-inline-input--price"
                              type="number"
                              step="0.01"
                              min="0"
                              autoFocus
                              value={inlineValue}
                              disabled={inlineSaving}
                              onChange={(e) => setInlineValue(e.target.value)}
                              onBlur={() => commitInlineEdit(p)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitInlineEdit(p);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelInlineEdit();
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="admin-inline-edit"
                              onClick={() => startInlineEdit(p, "price")}
                              title={
                                (p.variants?.length ?? 0) > 1
                                  ? "Editar preço da variante padrão"
                                  : "Editar preço"
                              }
                            >
                              <span>{priceRange(p.variants)}</span>
                              <span className="admin-inline-edit__icon" aria-hidden>
                                <EditPencilIcon />
                              </span>
                            </button>
                          )}
                        </td>
                        <td className="admin-actions">
                          <button type="button" className="btn btn--sm btn--edit" onClick={() => openEditProduct(p)}>
                            <EditPencilIcon />
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${p.active === false ? "btn--success" : "btn--outline"}`}
                            onClick={() => toggleProductActive(p)}
                          >
                            {p.active === false ? <CheckActivateIcon /> : <BanIcon />}
                            {p.active === false ? "Publicar" : "Desativar"}
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${p.soldOut ? "btn--success" : "btn--warn"}`}
                            onClick={() => toggleSoldOut(p)}
                          >
                            {p.soldOut ? <CheckActivateIcon /> : <BanIcon />}
                            {p.soldOut ? "Ativar" : "Esgotar"}
                          </button>
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => deleteProduct(p.id, p.name)}>
                            <TrashIcon />
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        {products.length === 0 ? "Nenhum produto." : "Nenhum produto encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={Math.ceil(filteredProducts.length / PAGE_SIZE)}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        )}

        {tab === "categories" && (
          <div>
            <div className="admin-form-footer" style={{ border: 0, marginTop: 0, paddingTop: 0, justifyContent: "space-between" }}>
              <h2 className="admin-section-title" style={{ margin: 0 }}>
                Categorias ({categories.length})
              </h2>
              <button type="button" className="btn btn--gold btn--sm" onClick={openNewCategory}>
                Nova categoria
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Título</th>
                    <th>Slug</th>
                    <th>Home</th>
                    <th>Ordem</th>
                    <th>Variantes</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCategories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <SafeImage src={c.image} alt="" width={48} height={48} unoptimized style={{ objectFit: "cover" }} />
                      </td>
                      <td>{c.title}</td>
                      <td>{c.slug}</td>
                      <td>
                        <button type="button" className="btn btn--sm btn--outline" onClick={() => toggleCategoryHome(c)}>
                          {c.showOnHome ? "Sim" : "Não"}
                        </button>
                      </td>
                      <td>{c.sortOrder}</td>
                      <td>
                        <div className="admin-actions">
                          {(c.variantLabels ?? []).map((label) => (
                            <span key={label} className="badge badge--promo">
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="admin-actions">
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openEditCategory(c)}>
                          <EditPencilIcon />
                          Editar
                        </button>
                        <button type="button" className="btn btn--sm btn--danger" onClick={() => deleteCategory(c.id, c.title)}>
                          <TrashIcon />
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        Nenhuma categoria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={Math.ceil(categories.length / PAGE_SIZE)}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        )}

        {tab === "orders" && (
          <div>
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.user?.name ?? o.userEmail ?? "—"}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td>{o.payment}</td>
                    <td>
                      <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm btn--outline"
                        onClick={() => {
                          setEmailForm({
                            email: o.userEmail ?? o.user?.email ?? "",
                            templateId: "order_paid",
                            orderId: o.id,
                          });
                          setTab("emails");
                        }}
                      >
                        E-mail
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      Nenhum pedido.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={Math.ceil(orders.length / PAGE_SIZE)}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        )}

        {tab === "users" && (
          <div className="admin-grid">
            <div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Pedidos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr key={u.id} className={selectedUser === u.id ? "admin-table__row--active" : ""}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={`badge badge--${u.status === "ACTIVE" ? "promo" : "urgent"}`}>{u.status}</span>
                      </td>
                      <td>{u.ordersCount}</td>
                      <td className="admin-actions">
                        <button type="button" className="btn btn--sm btn--outline" onClick={() => loadUserDetail(u.id)}>
                          Ver
                        </button>
                        <button type="button" className="btn btn--sm btn--dark" onClick={() => impersonateUser(u.id)}>
                          Logar como
                        </button>
                        {u.status === "ACTIVE" ? (
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => revokeUser(u.id, "REVOKED")}>
                            Revogar
                          </button>
                        ) : (
                          <button type="button" className="btn btn--sm btn--gold" onClick={() => revokeUser(u.id, "ACTIVE")}>
                            Restaurar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={Math.ceil(users.length / PAGE_SIZE)}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
            </div>

            {selectedUser && userDetail && (
              <aside className="admin-detail">
                <h3>Pedidos do usuário</h3>
                {userDetail.orders.length === 0 ? (
                  <p>Nenhum pedido.</p>
                ) : (
                  userDetail.orders.map((o) => (
                    <div key={o.id} className="order-row">
                      <span>{o.id}</span>
                      <span>{formatPrice(o.total)}</span>
                      <span>{o.status}</span>
                    </div>
                  ))
                )}
                <h3>E-mails enviados</h3>
                {userDetail.emails.map((e) => (
                  <div key={e.id} className="order-row">
                    <span>{e.template}</span>
                    <span>{new Date(e.sentAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </aside>
            )}
          </div>
        )}

        {tab === "coupons" && (
          <div className="admin-emails">
            <form className="admin-email-form" onSubmit={createCoupon}>
              <h3>Novo cupom</h3>
              <div className="admin-form-grid">
                <label className="form-field">
                  <span>Código</span>
                  <input
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  />
                </label>
                <label className="form-field">
                  <span>Tipo</span>
                  <select
                    value={couponForm.type}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, type: e.target.value as CouponForm["type"] })
                    }
                  >
                    <option value="percent">percent</option>
                    <option value="free_shipping">free_shipping</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Valor</span>
                  <input
                    type="number"
                    step="0.01"
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Pedido mínimo</span>
                  <input
                    type="number"
                    step="0.01"
                    value={couponForm.minOrder}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })}
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Descrição</span>
                  <input
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  <input
                    type="checkbox"
                    checked={couponForm.firstPurchaseOnly}
                    onChange={(e) => setCouponForm({ ...couponForm, firstPurchaseOnly: e.target.checked })}
                  />
                  Só 1ª compra
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={couponForm.active}
                    onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>
              <button type="submit" className="btn btn--gold" disabled={saving}>
                {saving ? "Salvando…" : "Criar cupom"}
              </button>
            </form>

            <div className="admin-email-logs">
              <h3>Cupons</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Mín.</th>
                    <th>1ª</th>
                    <th>Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCoupons.map((c) => (
                    <tr key={c.code}>
                      <td>{c.code}</td>
                      <td>{c.type}</td>
                      <td>{c.type === "percent" ? `${c.value}%` : formatPrice(c.value)}</td>
                      <td>{formatPrice(c.minOrder ?? 0)}</td>
                      <td>{c.firstPurchaseOnly ? "Sim" : "Não"}</td>
                      <td>
                        <span className={`badge badge--${c.active ? "promo" : "urgent"}`}>
                          {c.active ? "Ativo" : "Off"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        Nenhum cupom.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <AdminPagination
                page={page}
                totalPages={Math.ceil(coupons.length / PAGE_SIZE)}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          </div>
        )}

        {tab === "promotions" && promotions && (
          <form className="admin-email-form" onSubmit={savePromotions} style={{ maxWidth: 640 }}>
            <h3>Promoções globais</h3>
            <div className="admin-form-grid">
              <label className="form-field">
                <span>Frete grátis a partir de (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  value={promotions.freeShippingThreshold}
                  onChange={(e) =>
                    setPromotions({ ...promotions, freeShippingThreshold: Number(e.target.value) })
                  }
                />
              </label>
              <label className="form-field">
                <span>Desconto PIX (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={promotions.pixDiscountPercent}
                  onChange={(e) =>
                    setPromotions({ ...promotions, pixDiscountPercent: Number(e.target.value) })
                  }
                />
              </label>
              <label className="form-field form-field--full">
                <span>Banners (JSON)</span>
                <textarea
                  rows={10}
                  value={bannersJson}
                  onChange={(e) => setBannersJson(e.target.value)}
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="admin-form-footer">
              <button type="submit" className="btn btn--gold" disabled={saving}>
                {saving ? "Salvando…" : "Salvar promoções"}
              </button>
            </div>
          </form>
        )}

        {tab === "hero" && (
          <form className="admin-email-form" onSubmit={saveHeroCarousel} style={{ maxWidth: 720 }}>
            <h3>Carrossel da home</h3>
            <p className="admin-hint">
              Produtos ao lado de “A essência da elegância…”. Ordem = ordem do carrossel.
              Vazio = fallback automático (featured + lançamentos).
            </p>

            <div className="admin-form-row" style={{ alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
              <label className="form-field" style={{ flex: 1, minWidth: 220 }}>
                <span>Adicionar produto</span>
                <AutocompleteSelect
                  value={heroPickId}
                  options={heroProductOptions}
                  onChange={(id) => {
                    setHeroPickId(id);
                    if (id) addHeroProduct(id);
                  }}
                  placeholder={
                    heroProductIds.length >= HERO_MAX_SLIDES
                      ? `Máximo de ${HERO_MAX_SLIDES}`
                      : "Buscar produto…"
                  }
                  disabled={heroProductIds.length >= HERO_MAX_SLIDES}
                  allowClear={false}
                />
              </label>
            </div>

            {heroSlides.length === 0 ? (
              <p className="admin-hint">Nenhum produto selecionado — a home usa o fallback.</p>
            ) : (
              <ul className="admin-hero-list">
                {heroSlides.map((p, i) => (
                  <li key={p.id} className="admin-hero-list__item">
                    <span className="admin-hero-list__order">{i + 1}</span>
                    <SafeImage
                      src={p.image}
                      alt=""
                      width={48}
                      height={48}
                      className="admin-hero-list__thumb"
                      unoptimized
                    />
                    <div className="admin-hero-list__meta">
                      <strong>{p.brand}</strong>
                      <span>{p.name}</span>
                    </div>
                    <div className="admin-hero-list__actions">
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={i === 0}
                        onClick={() => moveHeroProduct(i, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={i === heroSlides.length - 1}
                        onClick={() => moveHeroProduct(i, 1)}
                        aria-label="Descer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => removeHeroProduct(p.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="admin-form-footer">
              <button
                type="button"
                className="btn btn--text"
                disabled={heroProductIds.length === 0 || saving}
                onClick={() => setHeroProductIds([])}
              >
                Limpar lista
              </button>
              <button type="submit" className="btn btn--gold" disabled={saving}>
                {saving ? "Salvando…" : "Salvar carrossel"}
              </button>
            </div>
          </form>
        )}

        {tab === "store" && (
          <form className="admin-email-form" onSubmit={saveStoreConfig} style={{ maxWidth: 640 }}>
            <h3>Configuração da loja</h3>
            <p className="admin-hint">
              Afeta só a vitrine (home, categoria, PDP e APIs públicas). No admin os produtos
              continuam com todas as variantes.
            </p>
            <label className="form-field form-field--full" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={storeConfig.maxPriceOnly}
                onChange={(e) => setStoreConfig({ maxPriceOnly: e.target.checked })}
                style={{ marginTop: "0.25rem" }}
              />
              <span>
                <strong>Só preço máximo</strong>
                <br />
                Desativa fracionados na loja: cada produto mostra apenas a variante mais cara,
                sem seletor de tamanho, e sem o texto de categoria no card/PDP.
              </span>
            </label>
            <div className="admin-form-footer">
              <button type="submit" className="btn btn--gold" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        {tab === "emails" && (
          <div className="admin-emails">
            <form className="admin-email-form" onSubmit={sendEmail}>
              <h3>Enviar template</h3>
              <label className="form-field">
                <span>E-mail</span>
                <input
                  required
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Template</span>
                <select
                  value={emailForm.templateId}
                  onChange={(e) => setEmailForm({ ...emailForm, templateId: e.target.value })}
                >
                  {EMAIL_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Pedido (opcional)</span>
                <input
                  value={emailForm.orderId}
                  onChange={(e) => setEmailForm({ ...emailForm, orderId: e.target.value })}
                  placeholder="LVL-..."
                />
              </label>
              <button type="submit" className="btn btn--gold">
                Enviar
              </button>
            </form>

            <div className="admin-email-templates">
              <h3>Templates disponíveis</h3>
              {EMAIL_TEMPLATES.map((t) => (
                <details key={t.id} className="admin-template">
                  <summary>
                    {t.name} — {t.subject}
                  </summary>
                  <pre>{t.body}</pre>
                </details>
              ))}
            </div>

            <div className="admin-email-logs">
              <h3>Últimos envios</h3>
              {emailLogs.map((l) => (
                <div key={l.id} className="order-row">
                  <span>{l.userEmail}</span>
                  <span>{l.template}</span>
                  <span>{new Date(l.sentAt).toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {productModal && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => closeProductModal()}
        >
          <div className="admin-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <div>
                <h2 className="admin-modal__title">
                  {productForm.id
                    ? productForm.active
                      ? "Editar produto"
                      : "Rascunho"
                    : "Novo produto"}
                </h2>
                {productForm.id && !productForm.active && draftStatus !== "saving" && draftStatus !== "error" && (
                  <p className="admin-draft-hint">Desativado na loja · salvando automaticamente</p>
                )}
                {!productForm.id && draftStatus === "idle" && (
                  <p className="admin-draft-hint">Salva como rascunho ao preencher marca e nome</p>
                )}
                {draftStatus === "saving" && (
                  <p className="admin-draft-hint">
                    {productForm.active ? "Salvando…" : "Salvando rascunho…"}
                  </p>
                )}
                {draftStatus === "saved" && productForm.id && (
                  <p className="admin-draft-hint admin-draft-hint--ok">
                    {productForm.active ? "Alterações salvas" : "Rascunho salvo"}
                  </p>
                )}
                {draftStatus === "error" && (
                  <p className="admin-draft-hint admin-draft-hint--err">Falha ao salvar</p>
                )}
              </div>
              <button type="button" className="admin-modal__close" onClick={() => closeProductModal()}>
                ×
              </button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="admin-form-grid">
                <label className="form-field">
                  <span>Marca</span>
                  <input
                    required
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Nome</span>
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Tipo (categoria)</span>
                  <AutocompleteSelect
                    required
                    value={productForm.type}
                    options={categoryOptions}
                    placeholder="Buscar categoria…"
                    onChange={(slug) => {
                      const cat = categoryBySlug.get(slug);
                      setProductForm((f) => ({
                        ...f,
                        type: slug,
                        category: cat?.title || f.category || slug,
                        subcategory: "",
                      }));
                      setVariantLabelMode(cat?.variantLabels?.length ? "pick" : "free");
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Subcategoria</span>
                  {selectedCategory?.subcategories?.length ? (
                    <AutocompleteSelect
                      value={productForm.subcategory}
                      options={subcategoryOptions}
                      placeholder="Buscar subcategoria…"
                      allowClear
                      onChange={(slug) =>
                        setProductForm({ ...productForm, subcategory: slug })
                      }
                    />
                  ) : (
                    <input
                      value={productForm.subcategory}
                      onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    />
                  )}
                </label>
                <label className="form-field">
                  <span>Category label</span>
                  <input
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="Rótulo exibido"
                  />
                </label>
                <label className="form-field">
                  <span>Slug</span>
                  <input
                    value={productForm.slug}
                    onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                    placeholder="auto se vazio"
                  />
                </label>
                <div className="form-field form-field--full">
                  <span>Descrição</span>
                  <div className="rich-text-toolbar">
                    <button
                      type="button"
                      className="rich-text-toolbar__btn"
                      title="Negrito (selecione o texto)"
                      onClick={wrapDescriptionBold}
                    >
                      <strong>N</strong>
                    </button>
                    <span className="rich-text-toolbar__hint">
                      Selecione o texto e clique em N, ou use **assim**
                    </span>
                  </div>
                  <textarea
                    ref={descriptionRef}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                        e.preventDefault();
                        wrapDescriptionBold();
                      }
                    }}
                    rows={5}
                    placeholder="Descrição do produto. Use **negrito** para destacar."
                  />
                </div>
                <label className="form-field form-field--full">
                  <span>Texto promo</span>
                  <input
                    value={productForm.promoText}
                    onChange={(e) => setProductForm({ ...productForm, promoText: e.target.value })}
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  />
                  Featured
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.isLaunch}
                    onChange={(e) => setProductForm({ ...productForm, isLaunch: e.target.checked })}
                  />
                  Lançamento
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.soldOut}
                    onChange={(e) => setProductForm({ ...productForm, soldOut: e.target.checked })}
                  />
                  Esgotado
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  />
                  Publicado na loja
                </label>
              </div>

              <p className="admin-section-title">Notas olfativas</p>
              <div className="admin-form-grid">
                <label className="form-field">
                  <span>Topo</span>
                  <input
                    value={productForm.notesTop}
                    onChange={(e) => setProductForm({ ...productForm, notesTop: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Coração</span>
                  <input
                    value={productForm.notesHeart}
                    onChange={(e) => setProductForm({ ...productForm, notesHeart: e.target.value })}
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Base</span>
                  <input
                    value={productForm.notesBase}
                    onChange={(e) => setProductForm({ ...productForm, notesBase: e.target.value })}
                  />
                </label>
              </div>

              <p className="admin-section-title">Variantes</p>
              <div className="admin-form-row">
                <label>
                  <input
                    type="radio"
                    name="variantLabelMode"
                    checked={variantLabelMode === "pick"}
                    onChange={() => setVariantLabelMode("pick")}
                    disabled={!categoryVariantLabels.length}
                  />
                  Labels da categoria
                </label>
                <label>
                  <input
                    type="radio"
                    name="variantLabelMode"
                    checked={variantLabelMode === "free"}
                    onChange={() => setVariantLabelMode("free")}
                  />
                  Texto livre
                </label>
                <button type="button" className="btn btn--sm btn--outline" onClick={addVariantRow}>
                  + Variante
                </button>
              </div>
              {productForm.variants.map((v, i) => (
                <div key={i} className="admin-form-grid" style={{ marginBottom: "0.5rem" }}>
                  <label className="form-field">
                    <span>Label</span>
                    {variantLabelMode === "pick" && categoryVariantLabels.length ? (
                      <AutocompleteSelect
                        value={v.label}
                        options={
                          v.label && !categoryVariantLabels.includes(v.label)
                            ? [...variantLabelOptions, { value: v.label, label: `${v.label} (atual)` }]
                            : variantLabelOptions
                        }
                        placeholder="Buscar label…"
                        onChange={(label) => updateVariant(i, { label })}
                      />
                    ) : (
                      <input value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })} />
                    )}
                  </label>
                  <label className="form-field">
                    <span>Preço</span>
                    <input
                      type="number"
                      step="0.01"
                      value={v.price}
                      onChange={(e) => updateVariant(i, { price: Number(e.target.value) })}
                    />
                  </label>
                  <label className="form-field">
                    <span>Preço antigo</span>
                    <input
                      type="number"
                      step="0.01"
                      value={v.oldPrice ?? ""}
                      onChange={(e) =>
                        updateVariant(i, {
                          oldPrice: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>SKU</span>
                    <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                  </label>
                  <div className="admin-form-row form-field--full" style={{ margin: 0 }}>
                    <label>
                      <input
                        type="radio"
                        name="defaultVariant"
                        checked={productForm.defaultVariant === i}
                        onChange={() => setProductForm({ ...productForm, defaultVariant: i })}
                      />
                      Padrão
                    </label>
                    <button type="button" className="btn btn--sm btn--outline" onClick={() => removeVariantRow(i)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}

              <p className="admin-section-title">Imagens</p>
              <label
                className={
                  "admin-dropzone" + (productDropActive ? " admin-dropzone--active" : "")
                }
                onDragEnter={onProductDragEnter}
                onDragLeave={onProductDragLeave}
                onDragOver={onProductDragOver}
                onDrop={onProductDrop}
              >
                <span className="admin-dropzone__label">
                  {uploading
                    ? "Enviando…"
                    : productDropActive
                      ? "Solte as fotos aqui"
                      : "Arraste fotos ou clique para enviar"}
                </span>
                <span className="admin-dropzone__hint">
                  PNG, JPG ou WebP — várias de uma vez
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) appendProductImages(files);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="admin-form-row" style={{ marginTop: "0.75rem" }}>
                <label className="form-field" style={{ flex: 1, minWidth: 180 }}>
                  <span>Ou cole URL</span>
                  <input
                    placeholder="https://…"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const input = e.currentTarget;
                      const url = input.value.trim();
                      if (!url) return;
                      setProductForm((f) => {
                        const images = [...f.images, url];
                        return { ...f, images, image: images[0] ?? url };
                      });
                      input.value = "";
                    }}
                  />
                </label>
              </div>
              {productForm.images.length > 0 && (
                <div className="admin-actions" style={{ marginBottom: "0.75rem" }}>
                  {productForm.images.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        alignItems: "center",
                        border: i === 0 ? "1px solid var(--color-gold)" : "1px solid var(--color-sand)",
                        padding: "0.35rem",
                      }}
                    >
                      <SafeImage src={url} alt="" width={64} height={64} unoptimized style={{ objectFit: "cover" }} />
                      <div className="admin-actions">
                        {i > 0 && (
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => setPrimaryImage(i)}>
                            1ª
                          </button>
                        )}
                        <button type="button" className="btn btn--sm btn--dark" onClick={() => removeProductImage(i)}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-form-footer">
                <button type="button" className="btn btn--outline" onClick={() => closeProductModal()}>
                  Fechar
                </button>
                <button type="submit" className="btn btn--gold" disabled={saving}>
                  {saving
                    ? "Salvando…"
                    : productForm.active
                      ? "Salvar"
                      : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModal && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setCategoryModal(false)}
        >
          <div className="admin-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">{categoryForm.id ? "Editar categoria" : "Nova categoria"}</h2>
              <button type="button" className="admin-modal__close" onClick={() => setCategoryModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={saveCategory}>
              <div className="admin-form-grid">
                <label className="form-field">
                  <span>Slug</span>
                  <input
                    required
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Título</span>
                  <input
                    required
                    value={categoryForm.title}
                    onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Subtítulo</span>
                  <input
                    value={categoryForm.subtitle}
                    onChange={(e) => setCategoryForm({ ...categoryForm, subtitle: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Ordem</span>
                  <input
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                  />
                </label>
                <label className="form-field">
                  <span>Imagem URL</span>
                  <input
                    value={categoryForm.image}
                    onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Variant labels (vírgula)</span>
                  <input
                    value={categoryForm.variantLabelsText}
                    onChange={(e) => setCategoryForm({ ...categoryForm, variantLabelsText: e.target.value })}
                    placeholder="4ml, 10ml, 100ml"
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  <input
                    type="checkbox"
                    checked={categoryForm.showOnHome}
                    onChange={(e) => setCategoryForm({ ...categoryForm, showOnHome: e.target.checked })}
                  />
                  Mostrar na home
                </label>
              </div>
              <label
                className={
                  "admin-dropzone" + (categoryDropActive ? " admin-dropzone--active" : "")
                }
                onDragEnter={onCategoryDragEnter}
                onDragLeave={onCategoryDragLeave}
                onDragOver={onCategoryDragOver}
                onDrop={onCategoryDrop}
              >
                <span className="admin-dropzone__label">
                  {uploading
                    ? "Enviando…"
                    : categoryDropActive
                      ? "Solte a foto aqui"
                      : "Arraste uma foto ou clique para enviar"}
                </span>
                <span className="admin-dropzone__hint">PNG, JPG ou WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) appendCategoryImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {categoryForm.image && (
                <div className="admin-form-row" style={{ marginTop: "0.75rem" }}>
                  <SafeImage
                    src={categoryForm.image}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}

              <p className="admin-section-title">Subcategorias</p>
              {categoryForm.subcategories.map((s, i) => (
                <div key={i} className="admin-form-grid" style={{ marginBottom: "0.35rem" }}>
                  <label className="form-field">
                    <span>Slug</span>
                    <input
                      value={s.slug}
                      onChange={(e) => {
                        const subcategories = [...categoryForm.subcategories];
                        subcategories[i] = { ...subcategories[i], slug: e.target.value };
                        setCategoryForm({ ...categoryForm, subcategories });
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span>Label</span>
                    <input
                      value={s.label}
                      onChange={(e) => {
                        const subcategories = [...categoryForm.subcategories];
                        subcategories[i] = { ...subcategories[i], label: e.target.value };
                        setCategoryForm({ ...categoryForm, subcategories });
                      }}
                    />
                  </label>
                  <div className="form-field--full">
                    <button
                      type="button"
                      className="btn btn--sm btn--outline"
                      onClick={() =>
                        setCategoryForm({
                          ...categoryForm,
                          subcategories: categoryForm.subcategories.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={() =>
                  setCategoryForm({
                    ...categoryForm,
                    subcategories: [...categoryForm.subcategories, { slug: "", label: "" }],
                  })
                }
              >
                + Subcategoria
              </button>

              <div className="admin-form-footer">
                <button type="button" className="btn btn--outline" onClick={() => setCategoryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--gold" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
