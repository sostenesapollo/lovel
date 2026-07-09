import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { CartProvider } from "@/context/cart-context";
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

export const metadata: Metadata = {
  title: "LOVEL — Boutique · Essence · Soin",
  description: "Perfumes, cabelos e skincare premium. Decants, frascos inteiros e rotina facial importada.",
  icons: {
    icon: "/icone.jpg",
    apple: "/icone.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable}`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
