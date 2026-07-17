"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import { LovelLogo } from "@/components/lovel-logo";
import { WHATSAPP_DISPLAY, whatsappHref } from "@/lib/constants";
import { categoryPath } from "@/lib/utils";
import type { SafeUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", key: "home" },
  { href: categoryPath("perfumes"), label: "Perfumes", key: "perfumes" },
  { href: categoryPath("cabelos"), label: "Cabelos", key: "cabelos" },
  { href: categoryPath("skincare"), label: "Skincare", key: "skincare" },
  { href: "/personal-shopper", label: "Personal Shopper", key: "personal-shopper" },
  { href: "/guia", label: "Guias", key: "guia" },
  { href: "/depoimentos", label: "Depoimentos", key: "depoimentos" },
  { href: "/#contato", label: "Contato", key: "contato" },
];

export function SiteHeader({ activeNav = "" }: { activeNav?: string }) {
  const { count } = useCart();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="top-banner" role="region" aria-label="Promoções">
        <div className="top-banner__track">
          <div className="top-banner__group">
            <span className="top-banner__item"><strong>Frete Grátis</strong> acima de R$199 · 🇧🇷 envio para todo o Brasil</span>
            <span className="top-banner__divider" aria-hidden="true">·</span>
            <span className="top-banner__item"><strong>5% OFF</strong> no PIX</span>
            <span className="top-banner__divider" aria-hidden="true">·</span>
            <span className="top-banner__item">Cupom <strong>PRIMEIRACOMPRA</strong> na 1ª compra</span>
            <span className="top-banner__divider" aria-hidden="true">·</span>
            <span className="top-banner__item"><strong>Oferta do dia</strong> · preços até meia-noite</span>
          </div>
          <div className="top-banner__group top-banner__group--clone" aria-hidden="true">
            <span className="top-banner__item"><strong>Frete Grátis</strong> acima de R$199 · 🇧🇷 envio para todo o Brasil</span>
            <span className="top-banner__divider">·</span>
            <span className="top-banner__item"><strong>5% OFF</strong> no PIX</span>
            <span className="top-banner__divider">·</span>
            <span className="top-banner__item">Cupom <strong>PRIMEIRACOMPRA</strong> na 1ª compra</span>
            <span className="top-banner__divider">·</span>
            <span className="top-banner__item"><strong>Oferta do dia</strong> · preços até meia-noite</span>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container header__inner">
          <button
            type="button"
            className={`menu-toggle${menuOpen ? " menu-toggle--open" : ""}`}
            aria-label={menuOpen ? "Fechar menu" : "Menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>

          <Link href="/" className="logo logo--brand" aria-label="Lovel — início">
            <LovelLogo variant="header" />
          </Link>

          <nav className="nav" aria-label="Principal">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={`nav__link${activeNav === n.key ? " nav__link--active" : ""}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="header__actions">
            <Link href="/conta" className="header__icon-btn" aria-label="Minha conta">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
            <Link
              href="/carrinho"
              className="header__icon-btn header__cart"
              aria-label="Carrinho"
              data-cart-target
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M6 6L5 3H2" />
              </svg>
              {count > 0 && <span className="cart-badge">{count > 99 ? "99+" : count}</span>}
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`mobile-nav-overlay${menuOpen ? " mobile-nav-overlay--open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <nav
        id="mobile-nav"
        className={`mobile-nav${menuOpen ? " mobile-nav--open" : ""}`}
        aria-label="Menu mobile"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-nav__header">
          <span>Menu</span>
          <button
            type="button"
            className="mobile-nav__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {NAV.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            className={`mobile-nav__link${activeNav === n.key ? " mobile-nav__link--active" : ""}`}
            onClick={() => setMenuOpen(false)}
            tabIndex={menuOpen ? 0 : -1}
          >
            {n.label}
          </Link>
        ))}
        {user && <p className="mobile-nav__user">Olá, {user.name}</p>}
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer" id="contato">
      <div className="container footer__grid">
        <div>
          <div className="footer__brand">
            <Link href="/" className="logo logo--brand logo--footer" aria-label="Lovel — início">
              <LovelLogo variant="footer" />
            </Link>
          </div>
          <p className="footer__text">Perfumes, cabelos e skincare premium.</p>
          <div className="footer__social">
            <a
              href="https://www.instagram.com/lovel.essence/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@lovel.essence"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
              </svg>
            </a>
          </div>
        </div>
        <div>
          <h4 className="footer__heading">Contato</h4>
          <a
            className="footer__whatsapp"
            href={whatsappHref()}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
          <p className="footer__text">contato@lovel.com</p>
        </div>
        <div>
          <h4 className="footer__heading">Institucional</h4>
          <nav className="footer__nav" aria-label="Institucional">
            <Link href="/conta" className="footer__link">
              Minha conta
            </Link>
            <Link href="/depoimentos" className="footer__link">
              Depoimentos
            </Link>
            <Link href="/categoria?tipo=perfumes" className="footer__link">
              Perfumes
            </Link>
            <Link href="/personal-shopper" className="footer__link">
              Personal Shopper
            </Link>
            <Link href="/paraguai" className="footer__link">
              Comprar no Paraguai
            </Link>
            <Link
              href="/paraguai/ciudad-del-este-perfumes"
              className="footer__link"
            >
              Guia Ciudad del Este
            </Link>
          </nav>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} LOVEL. Todos os direitos reservados.</p>
          <p className="footer__disclaimer">
            A LOVEL é uma loja independente e não possui afiliação, patrocínio
            ou endosso das marcas comercializadas. Os produtos de grife
            listados são vendidos em frasco original lacrado de fábrica,
            adquiridos de distribuidor autorizado. Nomes e marcas são de
            propriedade de seus respectivos titulares.
          </p>
        </div>
      </div>
    </footer>
  );
}
