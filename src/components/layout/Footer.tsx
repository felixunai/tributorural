import Link from "next/link";
import { Sprout } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[oklch(0.10_0.04_160)] border-t border-white/10">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-[oklch(0.84_0.21_128)] flex items-center justify-center">
              <Sprout className="h-5 w-5 text-[oklch(0.18_0.07_130)]" />
            </div>
            <span className="font-heading font-bold text-lg text-white">
              Tributo<span className="text-[oklch(0.84_0.21_128)]">Rural</span>
            </span>
          </Link>

          <p className="text-sm text-white/30 text-center">
            © {new Date().getFullYear()} Tributo Rural. Todos os direitos reservados.
            <br className="sm:hidden" />
            {" "}Feito para o agronegócio brasileiro.
          </p>

          <nav className="flex gap-6 text-sm">
            <Link href="/#funcionalidades" className="text-white/50 hover:text-white/90 transition-colors">
              Funcionalidades
            </Link>
            <Link href="/pricing" className="text-white/50 hover:text-white/90 transition-colors">
              Planos
            </Link>
            <Link href="/login" className="text-white/50 hover:text-white/90 transition-colors">
              Entrar
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
