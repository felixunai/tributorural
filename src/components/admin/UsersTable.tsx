"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { PlanTier, SubscriptionStatus } from "@/types/prisma";

interface User {
  id: string;
  name: string | null;
  email: string;
  isBlocked: boolean;
  createdAt: Date;
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    plan: { name: string; tier: PlanTier };
  } | null;
}

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

  async function toggleBlock(userId: string, currentBlocked: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: !currentBlocked }),
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentBlocked } : u))
      );
      toast.success(currentBlocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    } else {
      toast.error("Erro ao atualizar usuário");
    }
  }

  const planColors: Record<PlanTier, string> = {
    FREE: "secondary",
    PRO: "default",
    ENTERPRISE: "default",
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status assinatura</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{user.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={planColors[user.subscription?.plan.tier ?? "FREE"] as "default" | "secondary"}>
                  {user.subscription?.plan.name ?? "Gratuito"}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {user.subscription?.status ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {formatDate(user.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={user.isBlocked ? "destructive" : "outline"}>
                  {user.isBlocked ? "Bloqueado" : "Ativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBlock(user.id, user.isBlocked)}
                  className={user.isBlocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive"}
                >
                  {user.isBlocked ? "Desbloquear" : "Bloquear"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
