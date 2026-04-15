"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calculator,
  Users,
  History,
  Settings,
  Sprout,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlanTier } from "@prisma/client";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/calculadora-rural",
    label: "Impostos Rurais",
    icon: Calculator,
    badge: null,
  },
  {
    href: "/calculadora-rh",
    label: "Cálculo CLT",
    icon: Users,
    requiredPlan: "PRO" as PlanTier,
  },
  {
    href: "/historico",
    label: "Histórico",
    icon: History,
    requiredPlan: "PRO" as PlanTier,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

interface AppSidebarProps {
  planTier: PlanTier;
}

export function AppSidebar({ planTier }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r bg-card flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
          <Sprout className="h-6 w-6" />
          <span>Tributo Rural</span>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isLocked =
            item.requiredPlan &&
            planTier === "FREE";

          return (
            <Link
              key={item.href}
              href={isLocked ? "/pricing" : item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                isLocked && "opacity-60"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isLocked && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  PRO
                </Badge>
              )}
              {isActive && !isLocked && (
                <ChevronRight className="h-3 w-3 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="rounded-lg bg-muted px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">Plano atual</p>
          <p className="text-sm font-semibold mt-0.5">
            {planTier === "FREE" && "Gratuito"}
            {planTier === "PRO" && "Profissional"}
            {planTier === "ENTERPRISE" && "Empresarial"}
          </p>
          {planTier === "FREE" && (
            <Link
              href="/pricing"
              className="text-xs text-primary font-medium mt-1 block hover:underline"
            >
              Fazer upgrade →
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
