import { formatPrice, pixPrice, productUrl, categoryUrl } from "./utils.js";
import { cart } from "./cart.js";
import { CATEGORIES } from "./config.js";

export function renderBadges(badges = []) {
  return badges.map((b) => `<span class="badge badge--${b.type}">${b.text}</span>`).join("");
}

export function renderVariantButtons(product, selectedIndex, context = "card") {
  if (product.singleVariant) return "";

  const prefix = context === "pdp" ? "pdp" : "card";
  return product.variants
    .map((v, i) => {
      const disabled = v.disabled || product.soldOut;
      const active = i === selectedIndex ? " variant-btn--active" : "";
      return `<button
        class="variant-btn${active}"
        data-product="${product.id}"
        data-variant="${i}"
        data-context="${prefix}"
        ${disabled ? "disabled" : ""}
        aria-pressed="${i === selectedIndex}"
      >${v.label}</button>`;
    })
    .join("");
}

export function renderProductCard(product, selectedIndex) {
  const idx = selectedIndex ?? product.defaultVariant ?? 0;
  const variant = product.variants[idx];
  const soldOutClass = product.soldOut ? " product-card--sold-out" : "";

  const oldPriceHtml = variant.oldPrice
    ? `<span class="product-card__price-old">${formatPrice(variant.oldPrice)}</span>`
    : "";

  const pixHtml = !product.soldOut
    ? `<span class="product-card__pix">ou ${formatPrice(pixPrice(variant.price))} no PIX (-5%)</span>`
    : "";

  return `
    <article class="product-card${soldOutClass}" data-id="${product.id}">
      <a href="${productUrl(product)}" class="product-card__image-wrap">
        <img class="product-card__image" src="${product.image}" alt="${product.name}" loading="lazy" width="400" height="400">
        <div class="product-card__badges">${renderBadges(product.badges)}</div>
      </a>
      <div class="product-card__body">
        <span class="product-card__brand">${product.brand}</span>
        <h3 class="product-card__name"><a href="${productUrl(product)}">${product.name}</a></h3>
        <span class="product-card__category">${product.category}</span>
        <div class="variant-selector" role="group" aria-label="Selecionar volumetria">
          ${renderVariantButtons(product, idx)}
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price" data-price-for="${product.id}">${formatPrice(variant.price)}</span>
          ${oldPriceHtml}
        </div>
        ${pixHtml}
        <button class="btn btn--dark" data-add-cart="${product.id}" data-variant="${idx}" ${product.soldOut ? "disabled" : ""}>
          ${product.soldOut ? "Indisponível" : "Comprar"}
        </button>
      </div>
    </article>
  `;
}

export function renderLayoutShell(activeNav = "") {
  const navItems = [
    { href: "index.html", label: "Home", key: "home" },
    { href: categoryUrl("perfumes"), label: "Perfumes", key: "perfumes" },
    { href: categoryUrl("cabelos"), label: "Cabelos", key: "cabelos" },
    { href: categoryUrl("skincare"), label: "Skincare", key: "skincare" },
    { href: "categoria.html?tipo=lancamentos", label: "Lançamentos", key: "lancamentos" },
    { href: "index.html#contato", label: "Contato", key: "contato" },
  ];

  const navHtml = navItems
    .map(
      (n) =>
        `<a href="${n.href}" class="nav__link${activeNav === n.key ? " nav__link--active" : ""}">${n.label}</a>`
    )
    .join("");

  const mobileNavHtml = navItems
    .map((n) => `<a href="${n.href}" class="mobile-nav__link">${n.label}</a>`)
    .join("");

  return {
    topBanner: `
      <div class="top-banner" role="region" aria-label="Promoções">
        <div class="container">
          <div class="top-banner__track">
            <span class="top-banner__item"><strong>Frete Grátis</strong> acima de R$199</span>
            <span class="top-banner__divider">|</span>
            <span class="top-banner__item"><strong>5% OFF</strong> no PIX</span>
            <span class="top-banner__divider">|</span>
            <span class="top-banner__item">Cupom <strong>PRIMEIRACOMPRA</strong> na 1ª compra</span>
          </div>
        </div>
      </div>`,

    header: `
      <header class="header">
        <div class="container header__inner">
          <a href="index.html" class="logo" aria-label="LOVEL — Página inicial">LOV<span>E</span>L</a>
          <nav class="nav" aria-label="Menu principal">${navHtml}</nav>
          <div class="header__actions">
            <a href="conta.html" class="header__icon" aria-label="Minha conta" title="Minha conta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
            </a>
            <a href="carrinho.html" class="header__icon" aria-label="Carrinho" style="position:relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M6 6L5 3H2"/></svg>
              <span class="cart-count">${cart.getCount()}</span>
            </a>
            <button class="menu-toggle" aria-label="Abrir menu"><span></span><span></span><span></span></button>
          </div>
        </div>
      </header>
      <nav class="mobile-nav" aria-label="Menu mobile">${mobileNavHtml}</nav>`,

    footer: `
      <footer class="footer" id="contato">
        <div class="container">
          <div class="footer__grid">
            <div class="footer__brand">
              <a href="index.html" class="logo">LOV<span>E</span>L</a>
              <p>Curadoria premium de perfumaria, haircare e skincare importados.</p>
              <a href="https://wa.me/5511999999999" class="footer__whatsapp" target="_blank" rel="noopener">WhatsApp Atendimento</a>
              <div class="footer__social">
                <a href="#" aria-label="Instagram">IG</a>
                <a href="#" aria-label="TikTok">TK</a>
              </div>
            </div>
            <div>
              <h4 class="footer__heading">Institucional</h4>
              <ul class="footer__links">
                <li><a href="#">Política de Privacidade</a></li>
                <li><a href="#">Política de Trocas</a></li>
              </ul>
            </div>
            <div>
              <h4 class="footer__heading">Ajuda</h4>
              <ul class="footer__links">
                <li><a href="#" data-open-decant-modal>O que é Decant?</a></li>
                <li><a href="conta.html">Minha Conta</a></li>
                <li><a href="carrinho.html">Meu Carrinho</a></li>
              </ul>
            </div>
            <div>
              <h4 class="footer__heading">Categorias</h4>
              <ul class="footer__links">
                ${Object.entries(CATEGORIES)
                  .map(([key, cat]) => `<li><a href="${categoryUrl(key)}">${cat.title}</a></li>`)
                  .join("")}
              </ul>
            </div>
          </div>
          <div class="footer__payments">
            <div class="payment-icons">
              <span class="payment-icon">Visa</span>
              <span class="payment-icon">Master</span>
              <span class="payment-icon payment-icon--pix">Pix</span>
            </div>
            <p style="font-size:0.75rem;color:var(--color-stone)">CNPJ: 00.000.000/0001-00</p>
          </div>
          <p class="footer__legal">LOVEL © 2026 — Todos os direitos reservados.</p>
        </div>
      </footer>`,

    decantModal: `
      <div class="modal-overlay" id="decant-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="modal">
          <button class="modal__close" data-close-modal aria-label="Fechar">×</button>
          <h2 class="modal__title" id="modal-title">O que é um fracionado / decant?</h2>
          <div class="modal__body">
            <p>Um decant é uma amostra fracionada do perfume original, transferida para um frasco spray menor e próprio.</p>
            <p><strong>Importante:</strong> decants não incluem a caixa ou embalagem original do fabricante. O conteúdo é 100% autêntico.</p>
          </div>
          <button class="btn btn--primary" data-close-modal>Entendi</button>
        </div>
      </div>`,
  };
}

export function mountLayout(activeNav = "") {
  const shell = renderLayoutShell(activeNav);
  const banner = document.getElementById("layout-banner");
  const header = document.getElementById("layout-header");
  const footer = document.getElementById("layout-footer");
  const modal = document.getElementById("layout-modal");

  if (banner) banner.innerHTML = shell.topBanner;
  if (header) header.innerHTML = shell.header;
  if (footer) footer.innerHTML = shell.footer;
  if (modal) modal.innerHTML = shell.decantModal;
}

export function updateCartBadge() {
  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = cart.getCount();
  });
}
