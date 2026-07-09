"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-layout";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setValid(Boolean(data.valid));
        setEmail(data.email ?? null);
      })
      .catch(() => setValid(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setMessage("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.replace("/conta");
        return;
      }
      setMessage(data.message || "Não foi possível salvar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Definir senha</h1>
      {valid === null ? (
        <p className="auth-message">Validando link…</p>
      ) : !valid ? (
        <>
          <p className="form-error">Este link é inválido ou já expirou.</p>
          <Link href="/conta" className="btn btn--gold btn--full" style={{ marginTop: "1rem", display: "block", textAlign: "center" }}>
            Voltar para entrar
          </Link>
        </>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          {email && <p className="auth-message">Conta: {email}</p>}
          <label className="form-field">
            <span>Nova senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Confirmar senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {message && <p className="form-error">{message}</p>}
          <button type="submit" className="btn btn--gold btn--full" disabled={loading}>
            {loading ? "Salvando…" : "Salvar e entrar"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="page page--account">
        <div className="container account-layout">
          <Suspense fallback={<div className="auth-card"><p className="auth-message">Carregando…</p></div>}>
            <SetPasswordForm />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
