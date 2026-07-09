import { api } from "../api.js";
import { initApp, initSelectedVariants } from "../app.js";
import { renderProductCard } from "../components.js";
import { CATEGORIES } from "../config.js";
import { getQueryParam } from "../utils.js";

async function init() {
  const tipo = getQueryParam("tipo") || "perfumes";
  const sub = getQueryParam("sub") || "";

  const isLaunch = tipo === "lancamentos";
  const activeNav = isLaunch ? "lancamentos" : tipo === "cabelos" ? "cabelos" : tipo;

  initApp(activeNav);

  const filters = isLaunch ? { launch: true } : { tipo };
  if (sub) filters.sub = sub;

  const products = await api.getProducts(filters);
  initSelectedVariants(products);

  const catInfo = isLaunch
    ? { title: "Lançamentos", subtitle: "Novidades da curadoria premium" }
    : CATEGORIES[tipo] || { title: tipo, subtitle: "", subcategories: [] };

  document.getElementById("cat-title").textContent = catInfo.title;
  document.getElementById("cat-breadcrumb").textContent = catInfo.title;
  document.getElementById("cat-subtitle").textContent = catInfo.subtitle;

  const filtersEl = document.getElementById("cat-filters");
  if (filtersEl && catInfo.subcategories?.length) {
    filtersEl.innerHTML = `
      <a href="categoria.html?tipo=${tipo}" class="filter-chip${!sub ? " filter-chip--active" : ""}">Todos</a>
      ${catInfo.subcategories
        .map(
          (s) =>
            `<a href="categoria.html?tipo=${tipo}&sub=${s.slug}" class="filter-chip${sub === s.slug ? " filter-chip--active" : ""}">${s.label}</a>`
        )
        .join("")}`;
  } else if (filtersEl) {
    filtersEl.innerHTML = "";
  }

  const countEl = document.getElementById("cat-count");
  if (countEl) countEl.textContent = `${products.length} produto${products.length !== 1 ? "s" : ""}`;

  const grid = document.getElementById("category-grid");
  if (products.length === 0) {
    grid.innerHTML = `<p class="empty-state">Nenhum produto encontrado nesta categoria.</p>`;
  } else {
    grid.innerHTML = products.map((p) => renderProductCard(p)).join("");
  }
}

init();
