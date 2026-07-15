import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { SocialProofToast } from "@/components/social-proof-toast";
import { CartProvider } from "@/context/cart-context";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const body = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Perfumes árabes, grifes e nicho, decants e frascos. Cabelos e skincare premium. Alternativa segura a comprar perfume no Paraguai.",
  icons: {
    icon: "/icone.jpg",
    apple: "/icone.jpg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Perfumes, decants e skincare premium. Curadoria LOVEL com envio para todo o Brasil.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Perfumes, decants e skincare premium. Curadoria LOVEL com envio para todo o Brasil.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable}`}>
        <Analytics />
        <CartProvider>
          {children}
          <SocialProofToast />
        </CartProvider>
      </body>
    </html>
  );
}
