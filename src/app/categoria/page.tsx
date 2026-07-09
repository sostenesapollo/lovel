"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/lib/constants";
import type { Product } from "@/lib/types";

function CategoryContent() {
  const params = useSearchParams();
  const tipo = params.get("tipo") ?? "perfumes";
  const sub = params.get("sub") ?? "";
  const [products, setProducts] = useState<Product[]>([]);

  const isLaunch = tipo === "lancamentos";
  const catKey = isLaunch ? "perfumes" : tipo;
  const category = CATEGORIES[catKey as keyof typeof CATEGORIES];

  useEffect(() => {
    const qs = new URLSearchParams();
    if (isLaunch) qs.set("launch", "true");
    else qs.set("tipo", tipo);
    if (sub) qs.set("sub", sub);
    fetch(`/api/products?${qs}`)
      .then((r) => r.json())
      .then(setProducts);
  }, [tipo, sub, isLaunch]);

  const title = isLaunch ? "Lançamentos" : category?.title ?? tipo;
  const subtitle = isLaunch ? "Novidades selecionadas" : category?.subtitle ?? "";

  return (
    <>
      <SiteHeader activeNav={tipo === "lancamentos" ? "lancamentos" : tipo} />
      <main className="page page--category">
        <div className="container">
          <header className="page-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>

          {category && !isLaunch && (
            <div className="subcategory-tabs">
              <Link
                href={`/categoria?tipo=${tipo}`}
                className={`subcategory-tab${!sub ? " subcategory-tab--active" : ""}`}
              >
                Todos
              </Link>
              {category.subcategories.map((s) => (
                <Link
                  key={s.slug}
                  href={`/categoria?tipo=${tipo}&sub=${s.slug}`}
                  className={`subcategory-tab${sub === s.slug ? " subcategory-tab--active" : ""}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}

          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {products.length === 0 && (
            <p className="empty-state">Nenhum produto encontrado nesta categoria.</p>
          )}
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
