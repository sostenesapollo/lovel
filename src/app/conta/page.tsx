"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import type { SafeUser } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type Order = {
  id: string;
  total: number;
  status: string;
  payment: string;
  createdAt: string;
};

type AuthMode = "login" | "register" | "forgot";

export default function AccountPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadSession() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user);
    if (data.user) {
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) setOrders(await ordersRes.json());
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setMessageOk(false);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await res.json();
        setMessage(data.message);
        setMessageOk(Boolean(data.success));
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: mode === "login" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        await loadSession();
      } else {
        setMessage(data.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    setOrders([]);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setMessage("");
    setMessageOk(false);
  }

  const title =
    mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Definir senha";

  return (
    <>
      <SiteHeader />
      <main className="page page--account">
        <div className="container account-layout">
          {!user ? (
            <div className="auth-card">
              <h1>{title}</h1>
              {mode === "forgot" && (
                <p className="auth-message">
                  Digite o e-mail da compra. Enviamos um link para criar ou redefinir sua senha.
                </p>
              )}
              <form className="auth-form" onSubmit={submitAuth}>
                {mode === "register" && (
                  <label className="form-field">
                    <span>Nome</span>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                )}
                <label className="form-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                {mode !== "forgot" && (
                  <label className="form-field">
                    <span>Senha</span>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </label>
                )}
                {message && (
                  <p className={messageOk ? "auth-message auth-message--success" : "form-error"}>
                    {message}
                  </p>
                )}
                <button type="submit" className="btn btn--gold btn--full" disabled={loading}>
                  {loading
                    ? "Aguarde…"
                    : mode === "login"
                      ? "Entrar"
                      : mode === "register"
                        ? "Cadastrar"
                        : "Enviar link"}
                </button>
              </form>
              <div className="auth-links">
                {mode === "login" && (
                  <>
                    <button type="button" className="btn btn--link" onClick={() => switchMode("forgot")}>
                      Esqueci / não tenho senha
                    </button>
                    <button type="button" className="btn btn--link" onClick={() => switchMode("register")}>
                      Criar conta
                    </button>
                  </>
                )}
                {mode === "register" && (
                  <button type="button" className="btn btn--link" onClick={() => switchMode("login")}>
                    Já tenho conta
                  </button>
                )}
                {mode === "forgot" && (
                  <button type="button" className="btn btn--link" onClick={() => switchMode("login")}>
                    Voltar para entrar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="account-panel">
              <div className="account-header">
                <div>
                  <h1>Olá, {user.name}</h1>
                  <p>{user.email} · {user.role === "ADMIN" ? "Administrador" : "Cliente"}</p>
                  {user.status === "REVOKED" && <p className="form-error">Seu acesso foi revogado.</p>}
                </div>
                <button type="button" className="btn btn--outline" onClick={logout}>Sair</button>
              </div>

              <h2>Meus pedidos</h2>
              {orders.length === 0 ? (
                <p className="empty-state">Nenhum pedido ainda. <Link href="/">Comprar agora</Link></p>
              ) : (
                <div className="orders-list">
                  {orders.map((o) => (
                    <div key={o.id} className="order-row">
                      <div>
                        <strong>{o.id}</strong>
                        <span>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <span>{formatPrice(o.total)}</span>
                      <span className={`order-status order-status--${o.status}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
