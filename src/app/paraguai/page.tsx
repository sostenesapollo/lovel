import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { absoluteUrl } from "@/lib/seo/site";
import { categoryPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    absolute: "Comprar perfume no Paraguai — guia completo | LOVEL",
  },
  description:
    "Guia LOVEL: comprar perfume no Paraguai, Ciudad del Este, riscos de procedência duvidosa, preços e alternativa com decants originais no Brasil.",
  alternates: { canonical: absoluteUrl("/paraguai") },
};

export default function ParaguaiIndexPage() {
  return (
    <>
      <SiteHeader activeNav="paraguai" />
      <main className="seo-page">
        <section className="seo-hero">
          <div className="container">
            <p className="seo-hero__eyebrow">Paraguai</p>
            <h1 className="seo-hero__title">
              Comprar perfume no Paraguai
            </h1>
            <p className="seo-hero__lead">
              Ciudad del Este, preços, golpes e quando o decant da LOVEL faz
              mais sentido do que a fronteira.
            </p>
            <div className="seo-hero__actions">
              <Link href={categoryPath("perfumes")} className="btn btn--dark">
                Ver perfumes LOVEL →
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container seo-body__prose">
            <p>
              Buscas por “perfume barato no Paraguai” e “Ciudad del Este
              perfumes” explodem no Brasil. A economia pode existir — o risco
              de procedência duvidosa e o custo da viagem também.
            </p>
            <p>
              Na LOVEL, a proposta é testar com decant, comprar original com
              orientação e evitar a loteria da fronteira quando o objetivo é
              só sentir a fragrância com segurança.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
