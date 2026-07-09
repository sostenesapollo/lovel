"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_TOKEN_KEY, EMAIL_TEMPLATES } from "@/lib/constants";
import { adminAuthHeaders } from "@/lib/admin-auth";
import type { Product, SafeUser } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

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
        <button type="submit" className="btn btn--gold btn--full">Entrar</button>
      </form>
      <Link href="/" className="btn btn--link">← Voltar à loja</Link>
    </div>
  );
}

export default function ListTablePage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "users" | "orders" | "products" | "emails">("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<{ orders: Order[]; emails: EmailLog[] } | null>(null);
  const [emailForm, setEmailForm] = useState({ email: "", templateId: "welcome" as string, orderId: "" });
  const [msg, setMsg] = useState("");
  const [r2Configured, setR2Configured] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const headers = useCallback(() => adminAuthHeaders(token ?? ""), [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    const h = headers();
    const [s, u, o, p, r2, logs] = await Promise.all([
      fetch("/api/admin/stats", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/users", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/orders", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/products", { headers: h }).then((r) => r.json()),
      fetch("/api/r2/presign-upload", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/emails", { method: "PUT", headers: h }).then((r) => r.json()),
    ]);
    setStats(s);
    setUsers(u);
    setOrders(o);
    setProducts(p);
    setR2Configured(r2.configured);
    setEmailLogs(logs);
  }, [token, headers]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  async function loadUserDetail(id: string) {
    setSelectedUser(id);
    const res = await fetch(`/api/admin/users/${id}`, { headers: headers() });
    const data = await res.json();
    setUserDetail({ orders: data.orders, emails: data.emails });
    setEmailForm((f) => ({ ...f, email: data.user.email }));
  }

  async function revokeUser(id: string, status: "ACTIVE" | "REVOKED") {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMsg(status === "REVOKED" ? "Acesso revogado." : "Acesso restaurado.");
    loadAll();
  }

  async function impersonateUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "POST", headers: headers() });
    const data = await res.json();
    if (data.success) {
      setMsg(`Logado como ${data.user.name}. Abra /conta em outra aba.`);
      window.open("/conta", "_blank");
    } else {
      setMsg(data.message ?? "Erro ao impersonar.");
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
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
    setMsg(data.success ? "E-mail enviado!" : data.message ?? "Erro ao enviar.");
    loadAll();
  }

  async function uploadProductImage(productId: string, file: File) {
    if (!r2Configured) {
      setMsg("R2 não configurado — use URL manual.");
      return;
    }
    setUploading(true);
    try {
      const presign = await fetch("/api/r2/presign-upload", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }).then((r) => r.json());

      await fetch(presign.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ image: presign.publicUrl, images: [presign.publicUrl] }),
      });

      setMsg("Imagem enviada ao R2!");
      loadAll();
    } catch {
      setMsg("Falha no upload R2.");
    } finally {
      setUploading(false);
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
          {(["dashboard", "users", "orders", "products", "emails"] as const).map((t) => (
            <button key={t} type="button" className={`admin-tab${tab === t ? " admin-tab--active" : ""}`} onClick={() => setTab(t)}>
              {t === "dashboard" ? "Dashboard" : t === "users" ? "Usuários" : t === "orders" ? "Pedidos" : t === "products" ? "Produtos" : "E-mails"}
            </button>
          ))}
        </nav>
        <div className="admin-header__actions">
          <Link href="/" className="btn btn--outline btn--sm">Loja</Link>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); }}>Sair</button>
        </div>
      </header>

      {msg && <div className="admin-toast">{msg} <button type="button" onClick={() => setMsg("")}>×</button></div>}

      <main className="admin-main container">
        {tab === "dashboard" && stats && (
          <div className="admin-stats">
            <div className="admin-stat"><span>Pedidos</span><strong>{stats.orders}</strong></div>
            <div className="admin-stat"><span>Produtos</span><strong>{stats.products}</strong></div>
            <div className="admin-stat"><span>Usuários</span><strong>{stats.users}</strong></div>
            <div className="admin-stat"><span>Receita</span><strong>{formatPrice(stats.revenue)}</strong></div>
            <div className="admin-stat"><span>R2</span><strong>{r2Configured ? "OK" : "Off"}</strong></div>
          </div>
        )}

        {tab === "users" && (
          <div className="admin-grid">
            <table className="admin-table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Role</th><th>Status</th><th>Pedidos</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={selectedUser === u.id ? "admin-table__row--active" : ""}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><span className={`badge badge--${u.status === "ACTIVE" ? "promo" : "urgent"}`}>{u.status}</span></td>
                    <td>{u.ordersCount}</td>
                    <td className="admin-actions">
                      <button type="button" className="btn btn--sm btn--outline" onClick={() => loadUserDetail(u.id)}>Ver</button>
                      <button type="button" className="btn btn--sm btn--dark" onClick={() => impersonateUser(u.id)}>Logar como</button>
                      {u.status === "ACTIVE" ? (
                        <button type="button" className="btn btn--sm btn--outline" onClick={() => revokeUser(u.id, "REVOKED")}>Revogar</button>
                      ) : (
                        <button type="button" className="btn btn--sm btn--gold" onClick={() => revokeUser(u.id, "ACTIVE")}>Restaurar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedUser && userDetail && (
              <aside className="admin-detail">
                <h3>Pedidos do usuário</h3>
                {userDetail.orders.length === 0 ? <p>Nenhum pedido.</p> : userDetail.orders.map((o) => (
                  <div key={o.id} className="order-row">
                    <span>{o.id}</span>
                    <span>{formatPrice(o.total)}</span>
                    <span>{o.status}</span>
                  </div>
                ))}
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

        {tab === "orders" && (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Data</th><th>Ações</th></tr>
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
                      {["pending_payment", "paid", "shipped", "delivered", "cancelled"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button type="button" className="btn btn--sm btn--outline" onClick={() => setEmailForm({ email: o.userEmail ?? "", templateId: "order_paid", orderId: o.id })}>E-mail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "products" && (
          <div className="admin-products">
            {products.map((p) => (
              <div key={p.id} className="admin-product-card">
                <Image src={p.image} alt={p.name} width={80} height={80} unoptimized />
                <div>
                  <strong>{p.brand} — {p.name}</strong>
                  <p>{p.category}</p>
                  <label className="admin-upload">
                    {uploading ? "Enviando…" : "Upload R2"}
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadProductImage(p.id, e.target.files[0])} />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--outline"
                  onClick={async () => {
                    const soldOut = !p.soldOut;
                    await fetch(`/api/admin/products/${p.id}`, {
                      method: "PUT",
                      headers: { ...headers(), "Content-Type": "application/json" },
                      body: JSON.stringify({ soldOut }),
                    });
                    loadAll();
                  }}
                >
                  {p.soldOut ? "Ativar" : "Esgotar"}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "emails" && (
          <div className="admin-emails">
            <form className="admin-email-form" onSubmit={sendEmail}>
              <h3>Enviar template</h3>
              <label className="form-field">
                <span>E-mail</span>
                <input required type="email" value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Template</span>
                <select value={emailForm.templateId} onChange={(e) => setEmailForm({ ...emailForm, templateId: e.target.value })}>
                  {EMAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Pedido (opcional)</span>
                <input value={emailForm.orderId} onChange={(e) => setEmailForm({ ...emailForm, orderId: e.target.value })} placeholder="LVL-..." />
              </label>
              <button type="submit" className="btn btn--gold">Enviar</button>
            </form>

            <div className="admin-email-templates">
              <h3>Templates disponíveis</h3>
              {EMAIL_TEMPLATES.map((t) => (
                <details key={t.id} className="admin-template">
                  <summary>{t.name} — {t.subject}</summary>
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
    </div>
  );
}
