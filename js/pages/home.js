import { api } from "../api.js";
import { initApp, initSelectedVariants } from "../app.js";
import { renderProductCard } from "../components.js";

async function init() {
  initApp("home");
  const products = await api.getProducts();

  initSelectedVariants(products);

  const grids = {
    "perfumes-grid": (p) => p.type === "perfumes",
    "haircare-grid": (p) => p.type === "cabelos",
    "skincare-grid": (p) => p.type === "skincare",
    "lancamentos-grid": (p) => p.isLaunch,
  };

  for (const [id, filter] of Object.entries(grids)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = products.filter(filter).map((p) => renderProductCard(p)).join("");
  }
}

init();
