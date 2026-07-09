"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  promoText: string;
  notesTop: string;
  notesHeart: string;
  notesBase: string;
  variants: ProductVariant[];
  defaultVariant: number;
  images: string[];
  image: string;
};

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
  { id: "emails", label: "E-mails" },
];

const ORDER_STATUSES = ["pending_payment", "paid", "shipped", "delivered", "cancelled"] as const;

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

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/stats", { headers: adminAuthHeaders(token) });
    if (res.ok) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      onLogin(token);
    } else {
      setError("Chave de admin inválida.");
    }
  }

  return (
    <div className="admin-login">
      <Image src="/icone.jpg" alt="LOVEL" width={64} height={64} className="admin-login__icon" />
      <h1>LOVEL Admin</h1>
      <p>/list-table</p>
      <form onSubmit={submit}>
        <input
          type="password"
          placeholder="CRON_SECRET"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--gold btn--full">
          Entrar
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
  const [tab, setTab] = useState<Tab>("dashboard");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [r2Configured, setR2Configured] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [promotions, setPromotions] = useState<Promotions | null>(null);
  const [bannersJson, setBannersJson] = useState("[]");
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<{ orders: Order[]; emails: EmailLog[] } | null>(null);
  const [emailForm, setEmailForm] = useState({ email: "", templateId: "welcome" as string, orderId: "" });

  const [productModal, setProductModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm());
  const [variantLabelMode, setVariantLabelMode] = useState<"pick" | "free">("free");

  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm());

  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm());

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const headers = useCallback(() => adminAuthHeaders(token ?? ""), [token]);

  const toast = useCallback((text: string) => {
    setMsg(text);
  }, []);

  const loadAll = useCallback(async () => {
    if (!token) return;
    const h = headers();
    try {
      const [s, u, o, p, cats, coups, promo, r2, logs] = await Promise.all([
        fetch("/api/admin/stats", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/users", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/orders", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/products", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/categories", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/coupons", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/promotions", { headers: h }).then((r) => r.json()),
        fetch("/api/r2/presign-upload", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/emails", { method: "PUT", headers: h }).then((r) => r.json()),
      ]);
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
      setR2Configured(Boolean(r2?.configured));
      setEmailLogs(Array.isArray(logs) ? logs : []);
    } catch {
      toast("Falha ao carregar dados do admin.");
    }
  }, [token, headers, toast]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.slug, c);
    return map;
  }, [categories]);

  const selectedCategory = productForm.type ? categoryBySlug.get(productForm.type) : undefined;
  const categoryVariantLabels = selectedCategory?.variantLabels ?? [];

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
    const firstType = categories[0]?.slug ?? "";
    const form = emptyProductForm(firstType);
    if (categories[0]) {
      form.category = categories[0].title;
      form.type = categories[0].slug;
    }
    setProductForm(form);
    setVariantLabelMode(categories[0]?.variantLabels?.length ? "pick" : "free");
    setProductModal(true);
  }

  function openEditProduct(p: AdminProduct) {
    setProductForm(productToForm(p));
    const cat = categoryBySlug.get(p.type);
    setVariantLabelMode(cat?.variantLabels?.length ? "pick" : "free");
    setProductModal(true);
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
    if (!productForm.brand || !productForm.name || !productForm.type) {
      toast("Marca, nome e tipo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        brand: productForm.brand,
        name: productForm.name,
        type: productForm.type,
        subcategory: productForm.subcategory,
        category: productForm.category || productForm.type,
        slug: productForm.slug || undefined,
        description: productForm.description,
        featured: productForm.featured,
        isLaunch: productForm.isLaunch,
        soldOut: productForm.soldOut,
        promoText: productForm.promoText || null,
        notes: {
          top: productForm.notesTop || undefined,
          heart: productForm.notesHeart || undefined,
          base: productForm.notesBase || undefined,
        },
        variants: productForm.variants.map((v, i) => ({
          label: v.label,
          price: Number(v.price) || 0,
          sku: v.sku || `${productForm.slug || productForm.name}-${i + 1}`,
          ...(v.oldPrice != null && v.oldPrice !== 0 ? { oldPrice: Number(v.oldPrice) } : {}),
        })),
        defaultVariant: productForm.defaultVariant,
        images: productForm.images,
        image: productForm.images[0] ?? productForm.image ?? "",
      };

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
      toast(isEdit ? "Produto atualizado." : "Produto criado.");
      setProductModal(false);
      loadAll();
    } finally {
      setSaving(false);
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

  if (!token) return <AdminLogin onLogin={setToken} />;

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
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => {
              localStorage.removeItem(ADMIN_TOKEN_KEY);
              setToken(null);
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {msg && (
        <div className="admin-toast">
          {msg}{" "}
          <button type="button" onClick={() => setMsg("")}>
            ×
          </button>
        </div>
      )}

      <main className="admin-main container">
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
                Produtos ({products.length})
              </h2>
              <button type="button" className="btn btn--gold btn--sm" onClick={openNewProduct}>
                Novo produto
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Marca</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Preço</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const thumb = p.images?.[0] || p.image;
                    return (
                      <tr key={p.id}>
                        <td>
                          {thumb ? (
                            <Image src={thumb} alt="" width={48} height={48} unoptimized style={{ objectFit: "cover" }} />
                          ) : (
                            <span style={{ color: "var(--color-muted)" }}>—</span>
                          )}
                        </td>
                        <td>{p.brand}</td>
                        <td>{p.name}</td>
                        <td>{p.type}</td>
                        <td>{priceRange(p.variants)}</td>
                        <td>
                          {p.soldOut ? (
                            <span className="badge badge--urgent">Esgotado</span>
                          ) : (
                            <span className="badge badge--promo">Ativo</span>
                          )}
                        </td>
                        <td className="admin-actions">
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => openEditProduct(p)}>
                            Editar
                          </button>
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => toggleSoldOut(p)}>
                            {p.soldOut ? "Ativar" : "Esgotar"}
                          </button>
                          <button type="button" className="btn btn--sm btn--dark" onClick={() => deleteProduct(p.id, p.name)}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        Nenhum produto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.image ? (
                          <Image src={c.image} alt="" width={48} height={48} unoptimized style={{ objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: "var(--color-muted)" }}>—</span>
                        )}
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
                        <button type="button" className="btn btn--sm btn--outline" onClick={() => openEditCategory(c)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn--sm btn--dark" onClick={() => deleteCategory(c.id, c.title)}>
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
          </div>
        )}

        {tab === "orders" && (
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
                {orders.map((o) => (
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
        )}

        {tab === "users" && (
          <div className="admin-grid">
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
                  {users.map((u) => (
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
                  {coupons.map((c) => (
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
      </main>

      {productModal && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal__panel">
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">{productForm.id ? "Editar produto" : "Novo produto"}</h2>
              <button type="button" className="admin-modal__close" onClick={() => setProductModal(false)}>
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
                  <select
                    required
                    value={productForm.type}
                    onChange={(e) => {
                      const slug = e.target.value;
                      const cat = categoryBySlug.get(slug);
                      setProductForm((f) => ({
                        ...f,
                        type: slug,
                        category: cat?.title || f.category || slug,
                        subcategory: "",
                      }));
                      setVariantLabelMode(cat?.variantLabels?.length ? "pick" : "free");
                    }}
                  >
                    <option value="">Selecione…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.title} ({c.slug})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Subcategoria</span>
                  {selectedCategory?.subcategories?.length ? (
                    <select
                      value={productForm.subcategory}
                      onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    >
                      <option value="">—</option>
                      {selectedCategory.subcategories.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label}
                        </option>
                      ))}
                    </select>
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
                <label className="form-field form-field--full">
                  <span>Descrição</span>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </label>
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
                      <select value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })}>
                        <option value="">Selecione…</option>
                        {categoryVariantLabels.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                        {v.label && !categoryVariantLabels.includes(v.label) && (
                          <option value={v.label}>{v.label} (atual)</option>
                        )}
                      </select>
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
              <div className="admin-form-row">
                <label className="admin-upload">
                  {uploading ? "Enviando…" : "Upload R2 (append)"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) appendProductImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
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
                      <Image src={url} alt="" width={64} height={64} unoptimized style={{ objectFit: "cover" }} />
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
                <button type="button" className="btn btn--outline" onClick={() => setProductModal(false)}>
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

      {categoryModal && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal__panel">
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
                <label className="admin-upload">
                  {uploading ? "Enviando…" : "Upload imagem R2"}
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
                  <Image src={categoryForm.image} alt="" width={48} height={48} unoptimized style={{ objectFit: "cover" }} />
                )}
              </div>

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
