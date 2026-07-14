import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { categoryPath } from "@/lib/utils";

export type CurationCategory = {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
};

export function CurationSection({ categories }: { categories: CurationCategory[] }) {
  if (categories.length === 0) return null;

  const firstHref = categoryPath(categories[0].slug);

  return (
    <section className="curation section section--alt">
      <div className="container">
        <header className="curation__header">
          <h2 className="curation__title">
            Curadoria de <em>luxo importado</em>
          </h2>
          <Link href={firstHref} className="curation__link">
            Ver todos →
          </Link>
        </header>

        <div className="curation__grid">
          {categories.map((card) => (
            <Link key={card.slug} href={categoryPath(card.slug)} className="curation-card">
              <div className="curation-card__image">
                <SafeImage
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="curation-card__img"
                  unoptimized
                />
                <div className="curation-card__overlay" />
                <div className="curation-card__content">
                  <span className="curation-card__label">{card.title}</span>
                  <span className="curation-card__sub">{card.subtitle}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
