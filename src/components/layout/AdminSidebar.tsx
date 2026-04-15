"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  PercentSquare,
  CreditCard,
  Sprout,
  ChevronLeft,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/produtos", label: "Produtos Rurais", icon: Package },
  { href: "/admin/aliquotas-icms", label: "Alíquotas ICMS", icon: PercentSquare },
  { href: "/admin/planos", label: "Planos", icon: CreditCard },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r bg-card flex flex-col">
      <div className="h-16 flex items-center px-6 border-b gap-3">
        <Sprout className="h-6 w-6 text-primary" />
        <div>
          <p className="font-bold text-sm leading-tight">Tributo Rural</p>
          <p className="text-xs text-muted-foreground">Painel Admin</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao sistema
        </Link>
      </div>
    </aside>
  );
}
