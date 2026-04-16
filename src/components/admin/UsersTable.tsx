"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Shield,
  ShieldOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Calculator,
  Crown,
  Loader2,
} from "lucide-react";
import type { PlanTier, SubscriptionStatus } from "@/types/prisma";

interface User {
  id: string;
  name: string | null;
  email: string;
  isBlocked: boolean;
  createdAt: string;
  _count: { calculations: number };
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
    plan: { name: string; tier: PlanTier };
  } | null;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  FREE: "Gratuito",
  PRO: "Profissional",
  ENTERPRISE: "Empresarial",
};

const PLAN_COLORS: Record<PlanTier, string> = {
  FREE: "bg-muted text-muted-foreground",
  PRO: "bg-primary/10 text-primary border-primary/20",
  ENTERPRISE: "bg-[oklch(0.84_0.21_128)/0.15] text-[oklch(0.45_0.15_130)] border-[oklch(0.84_0.21_128)/0.3]",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIALING: "Teste",
  PAST_DUE: "Pendente",
  CANCELED: "Cancelada",
  UNPAID: "Inadimplente",
  INCOMPLETE: "Incompleta",
};

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(planFilter !== "ALL" ? { plan: planFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchUsers, search]);

  async function handleToggleBlock(user: User) {
    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isBlocked: !user.isBlocked } : u));
        toast.success(user.isBlocked ? "Usuário desbloqueado" : "Usuário bloqueado");
      } else {
        toast.error("Erro ao atualizar usuário");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleChangePlan(userId: string, planTier: PlanTier) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) =>
          u.id === userId
            ? { ...u, subscription: updated.subscription }
            : u
        ));
        toast.success(`Plano alterado para ${PLAN_LABELS[planTier]}`);
      } else {
        toast.error("Erro ao alterar plano");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((t) => t - 1);
        toast.success("Usuário removido");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao deletar usuário");
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const currentTier = (user: User): PlanTier => user.subscription?.plan.tier ?? "FREE";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={planFilter}
          onValueChange={(v) => { setPlanFilter(v ?? "ALL"); setPage(1); }}
        >
          <SelectTrigger className="sm:w-48">
            <span className="flex-1 text-left">
              {planFilter === "ALL" ? "Todos os planos" : PLAN_LABELS[planFilter as PlanTier]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os planos</SelectItem>
            <SelectItem value="FREE">Gratuito</SelectItem>
            <SelectItem value="PRO">Profissional</SelectItem>
            <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{total} usuário{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const tier = currentTier(user);
            const isUpdating = updatingId === user.id;
            const isDeleting = deletingId === user.id;
            const isConfirming = confirmDeleteId === user.id;

            return (
              <Card key={user.id} className={user.isBlocked ? "opacity-60" : ""}>
                <CardContent className="py-4 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Avatar + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary text-sm">
                        {(user.name ?? user.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{user.name ?? "Sem nome"}</p>
                          {user.isBlocked && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">Bloqueado</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Cadastro: {formatDate(user.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            {user._count.calculations} cálculo{user._count.calculations !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Plan selector */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Select
                          value={tier}
                          onValueChange={(v) => { if (v !== null) handleChangePlan(user.id, v as PlanTier); }}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <span className={`flex-1 text-left font-medium text-xs px-0`}>
                              {PLAN_LABELS[tier]}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FREE">Gratuito</SelectItem>
                            <SelectItem value="PRO">Profissional</SelectItem>
                            <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sub status */}
                      {user.subscription?.status && (
                        <Badge
                          variant={user.subscription.status === "ACTIVE" ? "outline" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {STATUS_LABELS[user.subscription.status] ?? user.subscription.status}
                        </Badge>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-auto sm:ml-0">
                        {isConfirming ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleDelete(user.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${user.isBlocked ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                              onClick={() => handleToggleBlock(user)}
                              disabled={isUpdating}
                              title={user.isBlocked ? "Desbloquear usuário" : "Bloquear usuário"}
                            >
                              {isUpdating
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : user.isBlocked
                                  ? <ShieldOff className="h-4 w-4" />
                                  : <Shield className="h-4 w-4" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDeleteId(user.id)}
                              title="Deletar usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
