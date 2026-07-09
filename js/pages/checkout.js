import { api } from "../api.js";
import { initApp } from "../app.js";
import { cart } from "../cart.js";
import { auth } from "../auth.js";
import { formatPrice } from "../utils.js";
import { CONFIG } from "../config.js";

let selectedPayment = "pix";
let appliedCoupon = cart.getSavedCoupon();

function renderOrderSummary() {
  const totals = cart.calculateTotals(appliedCoupon);
  document.getElementById("co-subtotal").textContent = formatPrice(totals.subtotal);
  document.getElementById("co-discount").textContent =
    totals.discount > 0 ? `-${formatPrice(totals.discount)}` : formatPrice(0);
  document.getElementById("co-shipping").textContent =
    totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping);
  document.getElementById("co-total").textContent = formatPrice(totals.total);

  const pixRow = document.getElementById("co-pix-total");
  if (selectedPayment === "pix") {
    pixRow.style.display = "";
    document.getElementById("co-pix-value").textContent = formatPrice(totals.pixTotal);
  } else {
    pixRow.style.display = "none";
  }

  const couponMsg = document.getElementById("coupon-message");
  if (appliedCoupon?.valid) {
    couponMsg.textContent = appliedCoupon.coupon.description;
    couponMsg.className = "coupon-message coupon-message--success";
  } else if (appliedCoupon?.message) {
    couponMsg.textContent = appliedCoupon.message;
    couponMsg.className = "coupon-message coupon-message--error";
  } else {
    couponMsg.textContent = "";
    couponMsg.className = "coupon-message";
  }
}

function renderCartPreview() {
  const items = cart.getItems();
  document.getElementById("co-items").innerHTML = items
    .map(
      (i) =>
        `<div class="co-item"><span>${i.quantity}x ${i.name} (${i.variantLabel})</span><span>${formatPrice(i.price * i.quantity)}</span></div>`
    )
    .join("");
}

function bindEvents() {
  document.querySelectorAll("[data-payment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPayment = btn.dataset.payment;
      document.querySelectorAll("[data-payment]").forEach((b) => b.classList.remove("payment-option--active"));
      btn.classList.add("payment-option--active");
      renderOrderSummary();
    });
  });

  document.getElementById("btn-apply-coupon")?.addEventListener("click", async () => {
    const code = document.getElementById("coupon-input").value.trim();
    if (!code) return;

    const result = await api.validateCoupon(code, cart.getSubtotal());

    if (result.valid) {
      const c = result.coupon;
      if (c.firstPurchaseOnly && !cart.isFirstPurchase()) {
        appliedCoupon = { valid: false, message: "Cupom válido apenas na primeira compra." };
      } else if (c.minOrder && cart.getSubtotal() < c.minOrder) {
        appliedCoupon = { valid: false, message: `Pedido mínimo de ${formatPrice(c.minOrder)} para este cupom.` };
      } else {
        appliedCoupon = result;
        cart.saveCoupon(result);
      }
    } else {
      appliedCoupon = result;
      cart.saveCoupon(null);
    }

    renderOrderSummary();
  });

  document.getElementById("checkout-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (cart.getCount() === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    const form = e.target;
    const totals = cart.calculateTotals(appliedCoupon);
    const finalTotal = selectedPayment === "pix" ? totals.pixTotal : totals.total;

    const order = {
      customer: {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        cpf: form.cpf.value,
        address: {
          cep: form.cep.value,
          street: form.street.value,
          number: form.number.value,
          city: form.city.value,
          state: form.state.value,
        },
      },
      items: cart.getItems(),
      payment: selectedPayment,
      coupon: appliedCoupon?.valid ? appliedCoupon.coupon.code : null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: finalTotal,
    };

    const btn = document.getElementById("btn-place-order");
    btn.disabled = true;
    btn.textContent = "Processando...";

    try {
      const result = await api.createOrder(order);

      if (result.success) {
        auth.saveOrder({ ...order, orderId: result.orderId, status: "pending_payment" });
        cart.markPurchased();
        cart.clear();
        cart.saveCoupon(null);

        document.getElementById("checkout-main").style.display = "none";
        const success = document.getElementById("checkout-success");
        success.style.display = "";
        document.getElementById("order-id").textContent = result.orderId;

        if (selectedPayment === "pix" && result.pixCode) {
          document.getElementById("pix-section").style.display = "";
          document.getElementById("pix-code").textContent = result.pixCode;
        }
      } else {
        alert(result.message || "Erro ao processar pedido.");
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Finalizar Pedido";
    }
  });

  document.getElementById("btn-copy-pix")?.addEventListener("click", () => {
    const code = document.getElementById("pix-code").textContent;
    navigator.clipboard.writeText(code);
    document.getElementById("btn-copy-pix").textContent = "Copiado!";
    setTimeout(() => { document.getElementById("btn-copy-pix").textContent = "Copiar código PIX"; }, 2000);
  });
}

async function init() {
  initApp();

  if (cart.getCount() === 0) {
    window.location.href = "carrinho.html";
    return;
  }

  if (appliedCoupon) {
    document.getElementById("coupon-input").value = appliedCoupon.coupon?.code || "";
  }

  const user = auth.getUser();
  if (user) {
    const form = document.getElementById("checkout-form");
    form.name.value = user.name || "";
    form.email.value = user.email || "";
  }

  renderCartPreview();
  renderOrderSummary();
  bindEvents();
}

init();
