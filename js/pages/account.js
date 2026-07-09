import { initApp } from "../app.js";
import { auth } from "../auth.js";
import { api } from "../api.js";
import { formatPrice } from "../utils.js";

const STATUS_LABELS = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function showAuthForms() {
  document.getElementById("auth-forms").style.display = "";
  document.getElementById("account-dashboard").style.display = "none";
}

function showDashboard(user) {
  document.getElementById("auth-forms").style.display = "none";
  document.getElementById("account-dashboard").style.display = "";
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-email").textContent = user.email;

  const adminLink = document.getElementById("admin-link");
  adminLink.style.display = user.role === "admin" ? "" : "none";
}

async function renderOrders() {
  const orders = await auth.fetchOrders();
  const container = document.getElementById("orders-list");

  if (!orders.length) {
    container.innerHTML = `<p class="empty-state" style="padding:2rem 0">Você ainda não fez nenhum pedido. <a href="index.html">Comece a comprar</a></p>`;
    return;
  }

  container.innerHTML = orders
    .map(
      (o) => `
    <div class="order-card">
      <div class="order-card__header">
        <span class="order-card__id">${o.orderId || o.id}</span>
        <span class="order-card__date">${new Date(o.createdAt).toLocaleDateString("pt-BR")}</span>
        <span class="badge badge--${o.status === "paid" ? "promo" : "urgent"}">${STATUS_LABELS[o.status] || o.status}</span>
      </div>
      <div class="order-card__items">
        ${(o.items || [])
          .map((i) => `<span>${i.quantity}x ${i.name} (${i.variantLabel})</span>`)
          .join(" · ")}
      </div>
      <div class="order-card__footer">
        <span>${o.payment === "pix" ? "PIX" : "Cartão"}</span>
        <strong>${formatPrice(o.total)}</strong>
      </div>
    </div>`
    )
    .join("");
}

function bindTabs() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("auth-tab--active"));
      tab.classList.add("auth-tab--active");

      const isLogin = tab.dataset.tab === "login";
      document.getElementById("login-form").style.display = isLogin ? "" : "none";
      document.getElementById("register-form").style.display = isLogin ? "none" : "";
    });
  });
}

function bindForms() {
  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("login-message");
    const result = await auth.login(form.email.value, form.password.value);

    if (result.success) {
      showDashboard(result.user);
      renderOrders();
    } else {
      msg.textContent = result.message;
      msg.className = "auth-message auth-message--error";
    }
  });

  document.getElementById("register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("register-message");
    const result = await auth.register({
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
    });

    if (result.success) {
      showDashboard(result.user);
      renderOrders();
    } else {
      msg.textContent = result.message;
      msg.className = "auth-message auth-message--error";
    }
  });

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    auth.logout();
    showAuthForms();
  });
}

async function init() {
  initApp("conta");
  bindTabs();
  bindForms();

  const user = auth.getUser();
  if (user) {
    showDashboard(user);
    await renderOrders();
  } else {
    showAuthForms();
  }
}

init();
