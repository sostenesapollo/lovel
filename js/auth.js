import { CONFIG } from "./config.js";

const SESSION_KEY = "lovel_session";
const ORDERS_KEY = "lovel_orders";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("auth:changed", { detail: session }));
}

function loadLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
  } catch {
    return [];
  }
}

async function mockLogin(email, password) {
  const res = await fetch("data/users.json");
  const users = await res.json();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { success: false, message: "E-mail ou senha incorretos." };
  const { password: _, ...safe } = user;
  return { success: true, user: safe, token: `mock-${user.id}` };
}

async function mockRegister({ name, email, password }) {
  const existing = loadSession();
  if (existing) return { success: false, message: "Você já está logado." };

  const res = await fetch("data/users.json");
  const users = await res.json();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "Este e-mail já está cadastrado." };
  }

  const newUser = {
    id: `u-${Date.now()}`,
    email,
    name,
    role: "customer",
  };

  return { success: true, user: newUser, token: `mock-${newUser.id}`, message: "Conta criada! (modo demo — dados locais)" };
}

async function apiRequest(path, options = {}) {
  const session = loadSession();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${CONFIG.apiBaseUrl}${path}`, { ...options, headers });
  return res.json();
}

export const auth = {
  getUser() {
    return loadSession()?.user ?? null;
  },

  getToken() {
    return loadSession()?.token ?? null;
  },

  isLoggedIn() {
    return !!loadSession()?.user;
  },

  isAdmin() {
    return loadSession()?.user?.role === "admin";
  },

  async login(email, password) {
    let result;
    if (CONFIG.provider === "api") {
      result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } else {
      result = await mockLogin(email, password);
    }

    if (result.success) {
      saveSession({ user: result.user, token: result.token });
    }
    return result;
  },

  async register(data) {
    let result;
    if (CONFIG.provider === "api") {
      result = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } else {
      result = await mockRegister(data);
    }

    if (result.success) {
      saveSession({ user: result.user, token: result.token });
    }
    return result;
  },

  logout() {
    saveSession(null);
  },

  saveOrder(order) {
    const orders = loadLocalOrders();
    const user = auth.getUser();
    orders.unshift({
      ...order,
      userId: user?.id,
      userEmail: user?.email ?? order.customer?.email,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  },

  getOrders() {
    const user = auth.getUser();
    const all = loadLocalOrders();
    if (!user) return [];
    if (user.role === "admin") return all;
    return all.filter((o) => o.userId === user.id || o.userEmail === user.email);
  },

  async fetchOrders() {
    if (CONFIG.provider !== "api" || !auth.isLoggedIn()) {
      return auth.getOrders();
    }

    try {
      const orders = await apiRequest("/orders/mine");
      return Array.isArray(orders) ? orders : [];
    } catch {
      return auth.getOrders();
    }
  },
};
