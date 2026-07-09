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

export default function AccountPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

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
  }

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    setOrders([]);
  }

  return (
    <>
      <SiteHeader />
      <main className="page page--account">
        <div className="container account-layout">
          {!user ? (
            <div className="auth-card">
              <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
              <form onSubmit={submitAuth}>
                {mode === "register" && (
                  <label className="form-field">
                    <span>Nome</span>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                )}
                <label className="form-field">
                  <span>E-mail</span>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="form-field">
                  <span>Senha</span>
                  <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
                {message && <p className="form-error">{message}</p>}
                <button type="submit" className="btn btn--gold btn--full">
                  {mode === "login" ? "Entrar" : "Cadastrar"}
                </button>
              </form>
              <button type="button" className="btn btn--link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Criar conta" : "Já tenho conta"}
              </button>
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
