import { StarRating } from "@/components/star-rating";

const REVIEWS = [
  {
    author: "Camila R.",
    city: "São Paulo",
    rating: 5,
    quote:
      "Descobri meu perfume signature comprando decants aqui. Atendimento impecável e envio expresso.",
  },
  {
    author: "Larissa M.",
    city: "Belo Horizonte",
    rating: 5,
    quote:
      "Máscara Kérastase fracionada é genial — dá para testar antes de investir no pote inteiro.",
  },
  {
    author: "Beatriz S.",
    city: "Rio de Janeiro",
    rating: 5,
    quote:
      "Embalagem chique, frasco atomizador de qualidade e cheiro idêntico ao original. Nota 10.",
  },
];

type ReviewsSectionProps = {
  titleAs?: "h1" | "h2";
};

export function ReviewsSection({ titleAs: TitleTag = "h2" }: ReviewsSectionProps) {
  return (
    <section className="reviews-section section">
      <div className="container">
        <header className="reviews-section__header">
          <p className="reviews-section__eyebrow">Depoimentos</p>
          <TitleTag className="reviews-section__title">
            Amado por quem entende de <em>essência</em>
          </TitleTag>
          <div className="reviews-section__score">
            <StarRating value={4.9} size="md" />
            <span>4.9 · mais de 2.400 clientas</span>
          </div>
        </header>

        <div className="reviews-grid">
          {REVIEWS.map((review) => (
            <article key={review.author} className="review-card">
              <StarRating value={review.rating} />
              <blockquote className="review-card__text">{review.quote}</blockquote>
              <hr className="review-card__divider" />
              <footer className="review-card__author">
                <span className="review-card__name">{review.author}</span>
                <span className="review-card__city">Compra verificada · {review.city}</span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
