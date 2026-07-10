"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;

type Category = {
  slug: string;
  title: string;
  subtitle: string;
  subcategories: Array<{ slug: string; label: string }>;
};

type ProductsPage = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

function categoryHref(tipo: string, sub = "", q = "") {
  const qs = new URLSearchParams();
  qs.set("tipo", tipo);
  if (sub) qs.set("sub", sub);
  if (q) qs.set("q", q);
  return `/categoria?${qs}`;
}

function CategoryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tipo = params.get("tipo") ?? "perfumes";
  const sub = params.get("sub") ?? "";
  const q = (params.get("q") ?? "").trim();
  const [searchInput, setSearchInput] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const isLaunch = tipo === "lancamentos";
  const category = categories.find((c) => c.slug === tipo);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === q) return;
      router.replace(categoryHref(tipo, sub, next), { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, q, tipo, sub, router]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setError(false);

      const qs = new URLSearchParams();
      if (isLaunch) qs.set("launch", "true");
      else qs.set("tipo", tipo);
      if (sub) qs.set("sub", sub);
      if (q) qs.set("q", q);
      qs.set("page", String(pageNum));
      qs.set("limit", String(PAGE_SIZE));

      try {
        const res = await fetch(`/api/products?${qs}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as ProductsPage;
        if (reqId !== requestIdRef.current) return;

        setProducts((prev) => (replace ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        setTotal(data.total);
        setPage(pageNum);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setError(true);
        if (replace) {
          setProducts([]);
          setHasMore(false);
          setTotal(0);
        }
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [tipo, sub, isLaunch, q],
  );

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    void fetchPage(1, true);
  }, [fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void fetchPage(page + 1, false);
        }
      },
      { rootMargin: "480px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  const title = isLaunch ? "Lançamentos" : category?.title ?? tipo;
  const subtitle = isLaunch ? "Novidades selecionadas" : category?.subtitle ?? "";

  return (
    <>
      <SiteHeader activeNav={tipo === "lancamentos" ? "lancamentos" : tipo} />
      <main className="page page--category">
        <div className="container">
          <header className="page-header">
            <h1 className="page-header__title">{title}</h1>
            {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
            {total > 0 || q ? (
              <p className="page-header__meta">
                {q
                  ? `${total} resultado${total === 1 ? "" : "s"} para “${q}”`
                  : `${products.length} de ${total} produto${total === 1 ? "" : "s"}`}
                {q && products.length > 0 && products.length < total
                  ? ` · mostrando ${products.length}`
                  : null}
              </p>
            ) : null}
          </header>

          <label className="catalog-search">
            <span className="visually-hidden">Buscar produtos</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome ou marca…"
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>

          {category && !isLaunch && category.subcategories?.length > 0 && (
            <div className="filter-bar" role="tablist" aria-label="Subcategorias">
              <Link
                href={categoryHref(tipo, "", q)}
                className={`filter-chip${!sub ? " filter-chip--active" : ""}`}
              >
                Todos
              </Link>
              {category.subcategories.map((s) => (
                <Link
                  key={s.slug}
                  href={categoryHref(tipo, s.slug, q)}
                  className={`filter-chip${sub === s.slug ? " filter-chip--active" : ""}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}

          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {!loading && products.length === 0 && !error && (
            <p className="empty-state">
              {q
                ? `Nenhum produto encontrado para “${q}”.`
                : "Nenhum produto encontrado nesta categoria."}
            </p>
          )}
          {error && products.length === 0 && (
            <p className="empty-state">Não foi possível carregar os produtos.</p>
          )}

          <div ref={sentinelRef} className="product-grid__sentinel" aria-hidden={!loading}>
            {loading ? <p className="product-grid__loading">Carregando produtos…</p> : null}
            {!loading && !hasMore && products.length > 0 ? (
              <p className="product-grid__end">
                {q ? `Fim dos resultados para “${q}”` : `Você viu todos os ${total} produtos`}
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "4rem 0" }}>Carregando…</div>}>
      <CategoryContent />
    </Suspense>
  );
}
