"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sprout, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[oklch(0.10_0.04_160)]/95 backdrop-blur supports-[backdrop-filter]:bg-[oklch(0.10_0.04_160)]/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-[oklch(0.84_0.21_128)] flex items-center justify-center shadow-lg shadow-[oklch(0.84_0.21_128)/0.3]">
            <Sprout className="h-5 w-5 text-[oklch(0.18_0.07_130)]" />
          </div>
          <span className="font-heading font-bold text-lg text-white">
            Tributo<span className="text-[oklch(0.84_0.21_128)]">Rural</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link
            href="/#funcionalidades"
            className="text-white/70 hover:text-white transition-colors font-medium"
          >
            Funcionalidades
          </Link>
          <Link
            href="/pricing"
            className="text-white/70 hover:text-white transition-colors font-medium"
          >
            Planos e Preços
          </Link>
        </nav>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <Button
              asChild
              className="btn-lime border-0 shadow-none"
            >
              <Link href="/dashboard">Acessar sistema</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild className="btn-lime border-0 shadow-none">
                <Link href="/register">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white/80 hover:text-white p-1"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[oklch(0.10_0.04_160)] px-4 py-4 space-y-3">
          <Link
            href="/#funcionalidades"
            className="block text-white/80 hover:text-white py-2 font-medium"
            onClick={() => setOpen(false)}
          >
            Funcionalidades
          </Link>
          <Link
            href="/pricing"
            className="block text-white/80 hover:text-white py-2 font-medium"
            onClick={() => setOpen(false)}
          >
            Planos e Preços
          </Link>
          <div className="pt-2 flex flex-col gap-2">
            {session ? (
              <Button asChild className="btn-lime border-0 w-full">
                <Link href="/dashboard">Acessar sistema</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="text-white/80 hover:text-white hover:bg-white/10 w-full"
                >
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild className="btn-lime border-0 w-full">
                  <Link href="/register">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
