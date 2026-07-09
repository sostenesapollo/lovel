const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, "..", "data");

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf8"));
}

function saveJson(filename, data) {
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

let products = loadJson("products.json");
let coupons = loadJson("coupons.json");
let users = loadJson("users.json");
let orders = loadJson("orders.json");
let promotions = loadJson("promotions.json");

const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Não autenticado." });
  }
  const session = sessions.get(header.slice(7));
  if (!session) return res.status(401).json({ message: "Sessão expirada." });
  req.user = session.user;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito a administradores." });
  }
  next();
}

// ── Auth ──

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === email?.toLowerCase() && u.password === password);

  if (!user) return res.json({ success: false, message: "E-mail ou senha incorretos." });

  const token = generateToken();
  const { password: _, ...safe } = user;
  sessions.set(token, { user: safe });

  res.json({ success: true, user: safe, token });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "Preencha todos os campos." });
  }

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.json({ success: false, message: "Este e-mail já está cadastrado." });
  }

  const newUser = {
    id: `u-${Date.now()}`,
    email,
    password,
    name,
    role: "customer",
  };

  users.push(newUser);
  saveJson("users.json", users);

  const token = generateToken();
  const { password: _, ...safe } = newUser;
  sessions.set(token, { user: safe });

  res.json({ success: true, user: safe, token });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── Products ──

app.get("/api/products", (req, res) => {
  let result = [...products];
  const { tipo, sub, launch, featured } = req.query;

  if (tipo) result = result.filter((p) => p.type === tipo);
  if (sub) result = result.filter((p) => p.subcategory === sub);
  if (launch === "true") result = result.filter((p) => p.isLaunch);
  if (featured === "true") result = result.filter((p) => p.featured);

  res.json(result);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!product) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(product);
});

// ── Coupons ──

app.post("/api/coupons/validate", (req, res) => {
  const { code, orderTotal = 0 } = req.body;
  const coupon = coupons.find((c) => c.code.toUpperCase() === code?.toUpperCase() && c.active !== false);

  if (!coupon) return res.json({ valid: false, message: "Cupom inválido ou expirado." });
  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return res.json({ valid: false, message: `Pedido mínimo de R$ ${coupon.minOrder.toFixed(2)} para este cupom.` });
  }

  res.json({ valid: true, coupon });
});

// ── Orders ──

app.post("/api/orders", (req, res) => {
  const token = req.headers.authorization?.slice(7);
  const session = token ? sessions.get(token) : null;

  const order = {
    id: `LVL-${Date.now()}`,
    ...req.body,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? req.body.customer?.email,
    createdAt: new Date().toISOString(),
    status: "pending_payment",
  };

  orders.unshift(order);
  saveJson("orders.json", orders);

  const pixCode =
    order.payment === "pix"
      ? `00020126580014BR.GOV.BCB.PIX0136lovel@pagamentos.com.br52040000530398654${String(Math.round(order.total * 100)).padStart(6, "0")}5802BR5925LOVEL PERFUMARIA LTDA6009SAO PAULO62070503***6304ABCD`
      : null;

  console.log(`[ORDER] ${order.id} — R$ ${order.total.toFixed(2)} (${order.payment})`);

  res.json({ success: true, orderId: order.id, pixCode, message: "Pedido criado com sucesso!" });
});

app.get("/api/orders/mine", authMiddleware, (req, res) => {
  if (req.user.role === "admin") return res.json(orders);
  const mine = orders.filter((o) => o.userId === req.user.id || o.userEmail === req.user.email);
  res.json(mine);
});

// ── Admin ──

app.get("/api/admin/stats", authMiddleware, adminMiddleware, (_req, res) => {
  res.json({
    orders: orders.length,
    products: products.length,
    users: users.length,
    revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
  });
});

app.get("/api/admin/orders", authMiddleware, adminMiddleware, (_req, res) => {
  res.json(orders);
});

app.put("/api/admin/products/:id", authMiddleware, adminMiddleware, (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Produto não encontrado." });

  products[idx] = { ...products[idx], ...req.body, id: req.params.id };
  if (!products[idx].images?.length && products[idx].image) {
    products[idx].images = [products[idx].image];
  }

  saveJson("products.json", products);
  res.json({ success: true, product: products[idx] });
});

app.post("/api/admin/products", authMiddleware, adminMiddleware, (req, res) => {
  const product = req.body;
  if (!product.name || !product.brand || !product.type) {
    return res.status(400).json({ message: "Nome, marca e tipo são obrigatórios." });
  }

  const id = product.id || `${product.type[0]}${Date.now()}`;
  if (products.some((p) => p.id === id)) {
    return res.status(400).json({ message: "ID já existe." });
  }

  const newProduct = {
    defaultVariant: 0,
    badges: [],
    soldOut: false,
    ...product,
    id,
    slug: product.slug || `${product.brand}-${product.name}`.toLowerCase().replace(/\s+/g, "-"),
    images: product.images?.length ? product.images : product.image ? [product.image] : [],
  };

  products.push(newProduct);
  saveJson("products.json", products);
  res.json({ success: true, product: newProduct });
});

app.delete("/api/admin/products/:id", authMiddleware, adminMiddleware, (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Produto não encontrado." });

  products.splice(idx, 1);
  saveJson("products.json", products);
  res.json({ success: true });
});

app.get("/api/promotions", (_req, res) => {
  res.json(promotions);
});

app.put("/api/admin/orders/:id/status", authMiddleware, adminMiddleware, (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: "Pedido não encontrado." });

  order.status = req.body.status;
  saveJson("orders.json", orders);
  res.json({ success: true, order });
});

app.get("/api/admin/coupons", authMiddleware, adminMiddleware, (_req, res) => {
  res.json(coupons);
});

app.post("/api/admin/coupons", authMiddleware, adminMiddleware, (req, res) => {
  const coupon = req.body;
  if (!coupon.code || !coupon.type) {
    return res.status(400).json({ message: "Código e tipo são obrigatórios." });
  }
  const code = coupon.code.toUpperCase();
  if (coupons.some((c) => c.code.toUpperCase() === code)) {
    return res.status(400).json({ message: "Código já existe." });
  }
  const newCoupon = { ...coupon, code, active: coupon.active !== false };
  coupons.push(newCoupon);
  saveJson("coupons.json", coupons);
  res.json({ success: true, coupon: newCoupon });
});

app.put("/api/admin/coupons/:code", authMiddleware, adminMiddleware, (req, res) => {
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === req.params.code.toUpperCase());
  if (idx < 0) return res.status(404).json({ message: "Cupom não encontrado." });

  const newCode = (req.body.code || req.params.code).toUpperCase();
  coupons[idx] = { ...coupons[idx], ...req.body, code: newCode };
  saveJson("coupons.json", coupons);
  res.json({ success: true, coupon: coupons[idx] });
});

app.delete("/api/admin/coupons/:code", authMiddleware, adminMiddleware, (req, res) => {
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === req.params.code.toUpperCase());
  if (idx < 0) return res.status(404).json({ message: "Cupom não encontrado." });

  coupons.splice(idx, 1);
  saveJson("coupons.json", coupons);
  res.json({ success: true });
});

app.get("/api/admin/promotions", authMiddleware, adminMiddleware, (_req, res) => {
  res.json(promotions);
});

app.put("/api/admin/promotions", authMiddleware, adminMiddleware, (req, res) => {
  promotions = { ...promotions, ...req.body };
  saveJson("promotions.json", promotions);
  res.json({ success: true, promotions });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", provider: "lovel-api", products: products.length, orders: orders.length });
});

app.listen(PORT, () => {
  console.log(`LOVEL API rodando em http://localhost:${PORT}`);
  console.log(`  POST /api/auth/login | /api/auth/register`);
  console.log(`  GET  /api/products | /api/orders/mine`);
  console.log(`  GET  /api/admin/stats | /api/admin/orders`);
  console.log(`  POST /api/admin/products | PUT /api/admin/products/:id | DELETE /api/admin/products/:id`);
});
