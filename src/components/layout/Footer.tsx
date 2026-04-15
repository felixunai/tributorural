import Link from "next/link";
import { Sprout } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
            <Sprout className="h-5 w-5" />
            Tributo Rural
          </Link>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Tributo Rural. Todos os direitos reservados.
          </p>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Planos
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
