"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Shield, Menu } from "lucide-react";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <header className="h-14 md:h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer on desktop (no hamburger shown) */}
      <div className="hidden lg:block" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">
            {user?.name ?? user?.email}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          {user?.role === "ADMIN" && (
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <Shield className="mr-2 h-4 w-4" />
              Painel Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
