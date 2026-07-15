import { StarRating } from "@/components/star-rating";
import {
  formatReviewDate,
  type ProductReview,
  type ProductSocialProof,
} from "@/lib/product-social-proof";

type ProductReviewsProps = {
  proof: ProductSocialProof;
  productName: string;
};

export function ProductReviews({ proof, productName }: ProductReviewsProps) {
  return (
    <section className="pdp-reviews section" aria-labelledby="pdp-reviews-title">
      <div className="container">
        <header className="pdp-reviews__header">
          <p className="pdp-reviews__eyebrow">Avaliações</p>
          <h2 id="pdp-reviews-title" className="pdp-reviews__title">
            O que dizem sobre <em>{productName}</em>
          </h2>
          <div className="pdp-reviews__summary">
            <StarRating value={proof.rating} size="md" />
            <span className="pdp-reviews__score">{proof.rating.toFixed(1)}</span>
            <span className="pdp-reviews__count">
              {proof.reviewCount} avaliações verificadas
            </span>
          </div>
        </header>

        <div className="pdp-reviews__grid">
          {proof.reviews.map((review) => (
            <ReviewCard key={`${review.author}-${review.daysAgo}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="pdp-review-card">
      <div className="pdp-review-card__top">
        <StarRating value={review.rating} />
        <time className="pdp-review-card__when">{formatReviewDate(review.daysAgo)}</time>
      </div>
      <p className="pdp-review-card__text">{review.text}</p>
      <footer className="pdp-review-card__author">
        <span className="pdp-review-card__name">{review.author}</span>
        <span className="pdp-review-card__meta">Compra verificada · {review.city}</span>
      </footer>
    </article>
  );
}
