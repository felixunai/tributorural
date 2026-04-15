"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Sprout className="h-6 w-6" />
          <span>Tributo Rural</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/#funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">
            Funcionalidades
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Acessar sistema</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
