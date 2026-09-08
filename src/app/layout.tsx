import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Match de Colchón — LauraHomes",
  description:
    "Responde a seis preguntas rápidas y te decimos qué colchón encaja mejor contigo, con precios reales de nuestro catálogo.",
  authors: [{ name: "LauraHomes" }],
  // Prevent browsers from offering to translate a page that is Spanish by design.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      translate="no"
      className={`notranslate ${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
