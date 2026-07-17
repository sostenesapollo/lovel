import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { WHATSAPP_DISPLAY, whatsappHref } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo/site";
import { categoryPath } from "@/lib/utils";

const ORDER_MESSAGE =
  "Olá! Quero fazer meu pedido de Personal Shopper no Paraguai (K-Beauty / skincare).";

export const metadata: Metadata = {
  title: {
    absolute: "Personal Shopper Paraguai — K-Beauty em casa | LOVEL",
  },
  description:
    "Personal Shopper à distância no Paraguai: curadoria de skincare e K-Beauty originais, cotação nas lojas oficiais e envio direto para sua casa — sem viajar.",
  alternates: { canonical: absoluteUrl("/personal-shopper") },
  openGraph: {
    title: "Personal Shopper Paraguai — K-Beauty em casa | LOVEL",
    description:
      "Receba skincare e K-Beauty originais do Paraguai em casa. Curadoria, compra segura e envio cuidadoso.",
    url: absoluteUrl("/personal-shopper"),
    type: "website",
  },
};

const STEPS = [
  {
    num: "01",
    title: "Consultoria personalizada",
    desc: "Analisamos suas necessidades, tipo de pele e rotina para indicar o que realmente faz sentido — sem comprar no escuro.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
        <path d="M9 11h4M11 9v4" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Cotação e lista",
    desc: "Montamos o orçamento com produtos nas lojas oficiais do Paraguai e enviamos a lista clara para você aprovar.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M8 6h12M8 12h12M8 18h8" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Compra segura",
    desc: "Adquirimos direto em distribuidores autorizados — garantia de autenticidade e zero risco de falsificação.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Envio cuidadoso",
    desc: "Embalagem protegida e despacho direto para o seu endereço. Você recebe em casa, sem precisar viajar.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="3" y="7" width="18" height="12" rx="1" />
        <path d="M3 11h18M12 7v12" />
        <path d="M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  },
] as const;

const BENEFITS = [
  {
    title: "Zero risco de falsificação",
    desc: "100% originais — compra apenas em canais oficiais e distribuidores autorizados no Paraguai.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Acesso a marcas globais e K-Beauty",
    desc: "Curadoria de skincare coreano e importados que costumam ser difíceis ou caros no Brasil.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
      </svg>
    ),
  },
  {
    title: "Economia com comodidade",
    desc: "Preço de fronteira sem a viagem: você aproveita as condições do Paraguai e recebe em casa.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
] as const;

const SHOWCASE = [
  {
    label: "Limpeza",
    hint: "Cleansers, oils & balms",
    href: categoryPath("skincare"),
  },
  {
    label: "Tratamento & séruns",
    hint: "Ativos e rotina intensiva",
    href: categoryPath("skincare", "serum"),
  },
  {
    label: "Hidratação",
    hint: "Cremes e essências",
    href: categoryPath("skincare", "hidratante"),
  },
  {
    label: "Protetores solares",
    hint: "FPS leve e K-Beauty",
    href: categoryPath("skincare", "protetor"),
  },
] as const;

export default function PersonalShopperPage() {
  const ctaHref = whatsappHref(ORDER_MESSAGE);

  return (
    <>
      <SiteHeader activeNav="personal-shopper" />
      <main className="ps-page">
        {/* 1. Banner */}
        <section className="ps-hero" aria-labelledby="ps-hero-title">
          <div className="ps-hero__bg" aria-hidden="true" />
          <div className="container ps-hero__inner">
            <p className="ps-hero__eyebrow">Personal Shopper · Paraguai</p>
            <h1 id="ps-hero-title" className="ps-hero__title">
              K-Beauty e skincare importados — curados para você, em casa
            </h1>
            <p className="ps-hero__lead">
              Sem viajar. Sem risco de fake. Nós selecionamos, cotamos e
              compramos nas lojas oficiais do Paraguai e enviamos direto ao
              seu endereço.
            </p>
            <div className="ps-hero__actions">
              <a
                href={ctaHref}
                className="btn btn--gold"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fazer meu Pedido
              </a>
              <a href="#como-funciona" className="btn btn--text">
                Como funciona
              </a>
            </div>
          </div>
        </section>

        {/* 2. Como funciona */}
        <section id="como-funciona" className="section" aria-labelledby="ps-steps-title">
          <div className="container">
            <header className="section__header">
              <p className="section__eyebrow">Processo</p>
              <h2 id="ps-steps-title" className="section__title">
                Como funciona
              </h2>
              <p className="section__desc">
                Quatro passos simples — da consultoria ao pacote na sua porta.
              </p>
            </header>
            <ol className="ps-steps">
              {STEPS.map((step) => (
                <li key={step.num} className="ps-step">
                  <div className="ps-step__icon">{step.icon}</div>
                  <span className="ps-step__num">{step.num}</span>
                  <h3 className="ps-step__title">{step.title}</h3>
                  <p className="ps-step__desc">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. Por que contratar */}
        <section className="section section--alt" aria-labelledby="ps-why-title">
          <div className="container">
            <header className="section__header">
              <p className="section__eyebrow">Diferenciais</p>
              <h2 id="ps-why-title" className="section__title">
                Por que contratar?
              </h2>
              <p className="section__desc">
                Segurança, acesso e praticidade — o trio que importa quando se
                compra de longe.
              </p>
            </header>
            <ul className="ps-benefits">
              {BENEFITS.map((b) => (
                <li key={b.title} className="ps-benefit">
                  <div className="ps-benefit__icon">{b.icon}</div>
                  <h3 className="ps-benefit__title">{b.title}</h3>
                  <p className="ps-benefit__desc">{b.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Vitrine de inspiração */}
        <section className="section" aria-labelledby="ps-showcase-title">
          <div className="container">
            <header className="section__header">
              <p className="section__eyebrow">Inspiração</p>
              <h2 id="ps-showcase-title" className="section__title">
                O que você pode pedir
              </h2>
              <p className="section__desc">
                Categorias mais pedidas no Personal Shopper — diga o que busca
                e montamos a lista.
              </p>
            </header>
            <ul className="ps-showcase">
              {SHOWCASE.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="ps-showcase__item">
                    <span className="ps-showcase__label">{item.label}</span>
                    <span className="ps-showcase__hint">{item.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. CTA final */}
        <section className="ps-cta" aria-labelledby="ps-cta-title">
          <div className="container ps-cta__inner">
            <p className="ps-cta__eyebrow">Atendimento direto</p>
            <h2 id="ps-cta-title" className="ps-cta__title">
              Pronta para receber originais sem sair de casa?
            </h2>
            <p className="ps-cta__text">
              Fale conosco no WhatsApp. Em poucos minutos iniciamos sua
              consultoria e a cotação personalizada.
            </p>
            <a
              href={ctaHref}
              className="btn btn--gold btn--lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Iniciar no WhatsApp
            </a>
            <p className="ps-cta__phone">{WHATSAPP_DISPLAY}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
