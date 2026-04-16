export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StripePortalButton } from "@/components/shared/StripePortalButton";
import { formatDate } from "@/lib/utils";
import { CreditCard, User } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  });

  const sub = user?.subscription;

  const planLabels: Record<string, string> = {
    FREE: "Gratuito",
    PRO: "Profissional",
    ENTERPRISE: "Empresarial",
  };
  const planLabel = planLabels[session.user.planTier] ?? session.user.planTier;

  const subStatusLabel: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIALING: "Em período de teste",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    UNPAID: "Pagamento em atraso",
    INCOMPLETE: "Incompleta",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua conta e assinatura.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Nome</p>
              <p className="font-medium">{user?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Assinatura
          </CardTitle>
          <CardDescription>Gerencie seu plano e forma de pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{planLabel}</p>
              <p className="text-sm text-muted-foreground">
                {sub ? (subStatusLabel[sub.status] ?? sub.status) : "—"}
                {sub?.currentPeriodEnd && (
                  <> · Renova em {formatDate(sub.currentPeriodEnd)}</>
                )}
              </p>
            </div>
            <Badge variant={session.user.planTier === "FREE" ? "secondary" : "default"}>
              {session.user.planTier}
            </Badge>
          </div>

          <div className="border-t pt-4 space-y-3">
            {session.user.planTier === "FREE" ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Faça upgrade para desbloquear todas as funcionalidades.
                </p>
                <Button asChild>
                  <a href="/pricing">Ver planos</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Gerencie seu método de pagamento, faturas e cancele pelo portal Stripe.
                </p>
                <StripePortalButton />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
