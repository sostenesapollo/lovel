import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { ReviewsSection } from "@/components/reviews-section";

export const metadata: Metadata = {
  title: "Depoimentos — LOVEL",
  description: "O que nossas clientes dizem sobre perfumes, cabelos e skincare premium na LOVEL.",
};

export default function DepoimentosPage() {
  return (
    <>
      <SiteHeader activeNav="depoimentos" />
      <main>
        <ReviewsSection titleAs="h1" />
      </main>
      <SiteFooter />
    </>
  );
}
