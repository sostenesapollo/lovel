import { StarRating } from "@/components/star-rating";

const REVIEWS = [
  {
    author: "Camila R.",
    city: "São Paulo, SP",
    rating: 5,
    quote:
      "Descobri meu perfume signature comprando decants aqui. Atendimento impecável e envio expresso.",
  },
  {
    author: "Larissa M.",
    city: "Belo Horizonte, MG",
    rating: 5,
    quote:
      "Máscara Kérastase fracionada é genial — dá para testar antes de investir no pote inteiro.",
  },
  {
    author: "Beatriz S.",
    city: "Rio de Janeiro, RJ",
    rating: 5,
    quote:
      "Embalagem chique, frasco atomizador de qualidade e cheiro idêntico ao original. Nota 10.",
  },
  {
    author: "Fernanda O.",
    city: "Curitiba, PR",
    rating: 5,
    quote:
      "Comparando com o frasco da loja: mesma projeção. Responderam no WhatsApp em minutos.",
  },
  {
    author: "Juliana P.",
    city: "Brasília, DF",
    rating: 5,
    quote:
      "Comprei pra presente — a caixinha ficou tão elegante que nem precisei embrulhar.",
  },
  {
    author: "Marina C.",
    city: "Porto Alegre, RS",
    rating: 5,
    quote:
      "Segunda compra. Os frascos menores valem muito pra montar um wardrobe de perfumes.",
  },
  {
    author: "Patricia L.",
    city: "Salvador, BA",
    rating: 5,
    quote:
      "No calor da Bahia a fixação surpreendeu. Amostra lacrada e com validade ok.",
  },
  {
    author: "Amanda V.",
    city: "Florianópolis, SC",
    rating: 5,
    quote:
      "Senti o perfume exatamente como na resenha. Já indiquei pras amigas da ilha.",
  },
  {
    author: "Renata A.",
    city: "Recife, PE",
    rating: 5,
    quote:
      "Chegou em 4 dias no Nordeste. Embalagem reforçada e produto autêntico.",
  },
  {
    author: "Gabriela N.",
    city: "Fortaleza, CE",
    rating: 5,
    quote:
      "Decant perfeito pro clima quente. Projeção boa sem ficar enjoativo.",
  },
  {
    author: "Sofia T.",
    city: "Manaus, AM",
    rating: 5,
    quote:
      "Achei que demoraria por causa da distância — chegou antes do prazo. Surpresa!",
  },
  {
    author: "Helena D.",
    city: "Goiânia, GO",
    rating: 5,
    quote:
      "Skincare importado autenticado. Pele sem oleosidade depois de uma semana.",
  },
  {
    author: "Isabela F.",
    city: "Niterói, RJ",
    rating: 5,
    quote:
      "Embalagem intacta e validade longa. Já virou minha loja preferida de fracionados.",
  },
  {
    author: "Carolina M.",
    city: "Campinas, SP",
    rating: 5,
    quote:
      "Montando o kit completo aos poucos. Qualidade consistente em todos os pedidos.",
  },
  {
    author: "Tatiane B.",
    city: "Belém, PA",
    rating: 5,
    quote:
      "Primeira compra da Amazônia. Rastreio claro e perfume chegou sem vazamento.",
  },
  {
    author: "Priscila H.",
    city: "Natal, RN",
    rating: 5,
    quote:
      "Atendimento paciente tirou todas as dúvidas de notas olfativas. Amei a experiência.",
  },
  {
    author: "Vanessa K.",
    city: "Campo Grande, MS",
    rating: 5,
    quote:
      "Cabelo macio na primeira aplicação da máscara fracionada. Vou repetir o pedido.",
  },
  {
    author: "Aline J.",
    city: "João Pessoa, PB",
    rating: 5,
    quote:
      "Frete justo pro Nordeste e cheiro idêntico ao que provei na loja física.",
  },
  {
    author: "Daniela W.",
    city: "Vitória, ES",
    rating: 5,
    quote:
      "Atomizador de verdade, não aqueles borrifadores ruins. Diferença absurda.",
  },
  {
    author: "Michele Y.",
    city: "Maceió, AL",
    rating: 5,
    quote:
      "Presenteou a sogra e ela perguntou onde comprei. Cliente fiel desde então.",
  },
  {
    author: "Raquel Z.",
    city: "Cuiabá, MT",
    rating: 5,
    quote:
      "No calor do Centro-Oeste a fixação aguenta o dia inteiro. Recomendo demais.",
  },
  {
    author: "Elisa G.",
    city: "São Luís, MA",
    rating: 5,
    quote:
      "Pedidos pequenos pra testar várias fragrâncias. Economia inteligente.",
  },
  {
    author: "Bianca Q.",
    city: "Londrina, PR",
    rating: 5,
    quote:
      "Site fácil, checkout rápido e perfume chegou no prazo. Nota máxima.",
  },
  {
    author: "Natália X.",
    city: "Santos, SP",
    rating: 5,
    quote:
      "Compro pra mim e pras clientes do salão. Sempre qualidade premium.",
  },
  {
    author: "Olivia U.",
    city: "Porto Velho, RO",
    rating: 5,
    quote:
      "Mesmo longe, o cuidado no envio foi impecável. Voltarei a comprar.",
  },
  {
    author: "Clara E.",
    city: "Teresina, PI",
    rating: 5,
    quote:
      "Dúvida de volume? Me orientaram pelo WhatsApp e acertei de primeira.",
  },
  {
    author: "Yasmin I.",
    city: "Aracaju, SE",
    rating: 5,
    quote:
      "Fracionados com rótulo limpo e lacre. Transmite confiança de verdade.",
  },
  {
    author: "Letícia S.",
    city: "Uberlândia, MG",
    rating: 5,
    quote:
      "Terceira compra no mês. Virei clienta fidelíssima da LOVEL.",
  },
];

type ReviewsSectionProps = {
  titleAs?: "h1" | "h2";
};

function ReviewCard({
  review,
}: {
  review: (typeof REVIEWS)[number];
}) {
  return (
    <article className="review-card">
      <StarRating value={review.rating} />
      <blockquote className="review-card__text">{review.quote}</blockquote>
      <hr className="review-card__divider" />
      <footer className="review-card__author">
        <span className="review-card__name">{review.author}</span>
        <span className="review-card__city">Compra verificada · {review.city}</span>
      </footer>
    </article>
  );
}

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
            <span>4.9 · mais de 2.400 clientas em todo o Brasil</span>
          </div>
        </header>
      </div>

      <div className="reviews-carousel" aria-label="Depoimentos de clientas de todo o Brasil">
        <div className="reviews-carousel__viewport">
          <div className="reviews-carousel__track">
            <div className="reviews-carousel__group">
              {REVIEWS.map((review) => (
                <div key={review.author} className="reviews-carousel__item">
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
            <div className="reviews-carousel__group" aria-hidden="true">
              {REVIEWS.map((review) => (
                <div key={`clone-${review.author}`} className="reviews-carousel__item">
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
