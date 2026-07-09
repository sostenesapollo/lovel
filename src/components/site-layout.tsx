"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import { categoryPath } from "@/lib/utils";
import type { SafeUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", key: "home" },
  { href: categoryPath("perfumes"), label: "Perfumes", key: "perfumes" },
  { href: categoryPath("cabelos"), label: "Cabelos", key: "cabelos" },
  { href: categoryPath("skincare"), label: "Skincare", key: "skincare" },
  { href: "/guia", label: "Guias", key: "guia" },
  { href: "/paraguai", label: "Paraguai", key: "paraguai" },
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

  return (
    <>
      <div className="top-banner" role="region" aria-label="Promoções">
        <div className="container">
          <div className="top-banner__track">
            <span className="top-banner__item"><strong>Frete Grátis</strong> acima de R$199 · envio de Foz do Iguaçu</span>
            <span className="top-banner__divider">|</span>
            <span className="top-banner__item"><strong>5% OFF</strong> no PIX</span>
            <span className="top-banner__divider">|</span>
            <span className="top-banner__item">Cupom <strong>PRIMEIRACOMPRA</strong> na 1ª compra</span>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container header__inner">
          <button className="menu-toggle" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <span /><span /><span />
          </button>

          <Link href="/" className="logo logo--with-icon">
            <Image src="/icone.jpg" alt="LOVEL" width={40} height={40} className="logo__icon" priority />
            <span>LOVEL</span>
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
            <Link href="/carrinho" className="header__icon-btn header__cart" aria-label="Carrinho">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M6 6L5 3H2" />
              </svg>
              {count > 0 && <span className="cart-badge">{count}</span>}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <button className="mobile-nav__close" onClick={() => setMenuOpen(false)} aria-label="Fechar">×</button>
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
                {n.label}
              </Link>
            ))}
            {user && (
              <p className="mobile-nav__user">Olá, {user.name}</p>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

const WA = "5585989716043";
const WA_DISPLAY = "+55 85 98971-6043";

export function SiteFooter() {
  return (
    <footer className="footer" id="contato">
      <div className="container footer__grid">
        <div>
          <div className="footer__brand">
            <Image src="/icone.jpg" alt="LOVEL" width={48} height={48} className="footer__icon" />
            <span className="footer__logo">LOVEL</span>
          </div>
          <p className="footer__tagline">Boutique · Essence · Soin</p>
          <p className="footer__text">Perfumes, cabelos e skincare premium.</p>
          <div className="footer__social">
            <a href="https://www.instagram.com/lovel.essence/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              Instagram
            </a>
            <a href="https://www.tiktok.com/@lovel.essence" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              TikTok
            </a>
          </div>
        </div>
        <div>
          <h4 className="footer__heading">Contato</h4>
          <a
            className="footer__whatsapp"
            href={`https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pelo site da LOVEL.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp {WA_DISPLAY}
          </a>
          <p className="footer__text">contato@lovel.com.br</p>
        </div>
        <div>
          <h4 className="footer__heading">Institucional</h4>
          <Link href="/conta" className="footer__link">Minha conta</Link>
          <Link href="/depoimentos" className="footer__link">Depoimentos</Link>
          <Link href="/categoria?tipo=perfumes" className="footer__link">Perfumes</Link>
          <Link href="/guia" className="footer__link">Guias de perfume</Link>
          <Link href="/paraguai" className="footer__link">Comprar no Paraguai</Link>
          <Link href="/paraguai/comprar-perfume-no-paraguai" className="footer__link">
            Guia Ciudad del Este
          </Link>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} LOVEL. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
