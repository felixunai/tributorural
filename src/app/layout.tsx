import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Tributo Rural — Calculadora de Impostos Rurais",
    template: "%s | Tributo Rural",
  },
  description:
    "Calcule ICMS, PIS, COFINS e FUNRURAL para produtos rurais interestaduais. Simule o custo real de contratação CLT para sua empresa rural.",
  keywords: ["ICMS rural", "PIS COFINS agronegócio", "FUNRURAL", "custo CLT", "calculadora fiscal rural"],
  openGraph: {
    title: "Tributo Rural — Calculadora de Impostos Rurais",
    description: "Ferramenta fiscal para o agronegócio brasileiro",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
