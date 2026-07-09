import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-layout";

export const metadata: Metadata = {
  title: "Depoimentos — LOVEL",
  description: "O que nossas clientes dizem sobre perfumes, cabelos e skincare premium na LOVEL.",
};

const REVIEWS = [
  {
    author: "Camila R.",
    city: "São Paulo",
    quote:
      "Descobri meu perfume signature comprando decants aqui. Atendimento impecável e envio expresso.",
  },
  {
    author: "Larissa M.",
    city: "Belo Horizonte",
    quote:
      "Máscara Kérastase fracionada é genial — dá para testar antes de investir no pote inteiro.",
  },
  {
    author: "Beatriz S.",
    city: "Rio de Janeiro",
    quote:
      "Embalagem chique, frasco atomizador de qualidade e cheiro idêntico ao original. Nota 10.",
  },
];

export default function DepoimentosPage() {
  return (
    <>
      <SiteHeader activeNav="depoimentos" />
      <main>
        <section className="reviews-section section">
          <div className="container">
            <header className="reviews-section__header">
              <p className="reviews-section__eyebrow">Depoimentos</p>
              <h1 className="reviews-section__title">
                Amado por quem entende de <em>essência</em>
              </h1>
            </header>

            <div className="reviews-grid">
              {REVIEWS.map((review) => (
                <article key={review.author} className="review-card">
                  <span className="review-card__quote" aria-hidden="true">
                    &ldquo;
                  </span>
                  <blockquote className="review-card__text">{review.quote}</blockquote>
                  <hr className="review-card__divider" />
                  <footer className="review-card__author">
                    <span className="review-card__name">{review.author}</span>
                    <span className="review-card__city">{review.city}</span>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
