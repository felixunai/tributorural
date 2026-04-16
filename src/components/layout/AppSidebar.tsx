"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calculator,
  Users,
  History,
  Settings,
  Sprout,
  ChevronRight,
  X,
  LogOut,
  ShieldCheck,
  FileX2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlanTier } from "@prisma/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calculadora-rural", label: "Impostos Rurais", icon: Calculator },
  { href: "/calculadora-rh", label: "Cálculo CLT", icon: Users, requiredPlan: "PRO" as PlanTier },
  { href: "/calculadora-rescisao", label: "Rescisão CLT", icon: FileX2, requiredPlan: "PRO" as PlanTier },
  { href: "/historico", label: "Histórico", icon: History, requiredPlan: "PRO" as PlanTier },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

interface AppSidebarProps {
  planTier: PlanTier;
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ planTier, isAdmin, mobileOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  const content = (
    <aside
      className={cn(
        "flex flex-col bg-card border-r",
        // Desktop: always visible, fixed width
        "hidden lg:flex lg:w-64 lg:min-h-screen",
      )}
    >
      <SidebarContent planTier={planTier} isAdmin={isAdmin} pathname={pathname} />
    </aside>
  );

  const mobileContent = (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r w-72 transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Close button */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary" onClick={onClose}>
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>Tributo Rural</span>
        </Link>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <SidebarContent planTier={planTier} isAdmin={isAdmin} pathname={pathname} onNavClick={onClose} />
    </aside>
  );

  return (
    <>
      {content}
      {mobileContent}
    </>
  );
}

function SidebarContent({
  planTier,
  isAdmin,
  pathname,
  onNavClick,
}: {
  planTier: PlanTier;
  isAdmin?: boolean;
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo — desktop only */}
      <div className="hidden lg:flex h-16 items-center px-5 border-b shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-foreground">Tributo Rural</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const PLAN_ORDER = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
          const isLocked = item.requiredPlan
            ? PLAN_ORDER[planTier] < PLAN_ORDER[item.requiredPlan]
            : false;

          return (
            <Link
              key={item.href}
              href={isLocked ? "/pricing" : item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                isLocked && "opacity-60"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isLocked && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {item.requiredPlan}
                </Badge>
              )}
              {isActive && !isLocked && (
                <ChevronRight className="h-3 w-3 opacity-40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin link */}
      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            onClick={onNavClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all border border-violet-200"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Painel Admin
          </Link>
        </div>
      )}

      {/* Plan badge + logout */}
      <div className="p-3 border-t shrink-0 space-y-2">
        <div className="rounded-xl bg-muted px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">Plano atual</p>
          <p className="text-sm font-semibold mt-0.5">
            {planTier === "FREE" && "Gratuito"}
            {(planTier === "PRO" || planTier === "ENTERPRISE") && "Profissional"}
          </p>
          {planTier === "FREE" && (
            <Link
              href="/pricing"
              onClick={onNavClick}
              className="text-xs text-primary font-medium mt-1 block hover:underline"
            >
              Fazer upgrade →
            </Link>
          )}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </>
  );
}
