import Link from "next/link";
import Image from "next/image";
import { categoryPath } from "@/lib/utils";

const CARDS = [
  {
    href: categoryPath("perfumes"),
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=800&fit=crop",
    title: "Perfumes",
    subtitle: "Decants e Inteiros",
    local: false,
  },
  {
    href: categoryPath("cabelos"),
    image: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&q=80",
    title: "Cabelos",
    subtitle: "Óleos e Tratamentos",
    local: false,
  },
  {
    href: categoryPath("skincare"),
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
    title: "Skincare",
    subtitle: "Rotina Facial Premium",
    local: false,
  },
];

export function CurationSection() {
  return (
    <section className="curation section section--alt">
      <div className="container">
        <header className="curation__header">
          <h2 className="curation__title">
            Curadoria de <em>luxo importado</em>
          </h2>
          <Link href={categoryPath("perfumes")} className="curation__link">
            Ver todos →
          </Link>
        </header>

        <div className="curation__grid">
          {CARDS.map((card) => (
            <Link key={card.title} href={card.href} className="curation-card">
              <div className="curation-card__image">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="curation-card__img"
                  priority={card.local}
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
