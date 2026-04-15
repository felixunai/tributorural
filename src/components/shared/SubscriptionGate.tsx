"use client";

import { useSession } from "next-auth/react";
import type { PlanTier } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import Link from "next/link";

const PLAN_ORDER: Record<PlanTier, number> = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

interface SubscriptionGateProps {
  requiredPlan: PlanTier;
  children: React.ReactNode;
  featureName?: string;
}

export function SubscriptionGate({ requiredPlan, children, featureName }: SubscriptionGateProps) {
  const { data: session } = useSession();
  const userPlan = session?.user.planTier ?? "FREE";

  if (PLAN_ORDER[userPlan] >= PLAN_ORDER[requiredPlan]) {
    return <>{children}</>;
  }

  const planLabel = requiredPlan === "PRO" ? "Profissional" : "Empresarial";

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">
            {featureName ? `${featureName} requer plano ${planLabel}` : `Recurso disponível no plano ${planLabel}`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Faça upgrade para acessar esta funcionalidade.
          </p>
        </div>
        <Button asChild>
          <Link href="/pricing">Ver planos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
