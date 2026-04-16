"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

interface Quota {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  canCompute: boolean;
}

interface RuralCalcQuotaBannerProps {
  /** Call this to trigger a quota refresh after a calculation completes */
  onRefreshRef?: (fn: () => void) => void;
}

export function RuralCalcQuotaBanner({ onRefreshRef }: RuralCalcQuotaBannerProps) {
  const [quota, setQuota] = useState<Quota | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/rural");
      if (res.ok) setQuota(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchQuota();
    // Expose refresh fn to parent
    onRefreshRef?.(fetchQuota);
  }, [fetchQuota, onRefreshRef]);

  // PRO/ENTERPRISE — no banner needed
  if (!quota || quota.limit === null) return null;

  const { limit, used, remaining } = quota;
  const pct = Math.min(100, ((used ?? 0) / (limit ?? 1)) * 100);
  const atLimit = (remaining ?? 1) <= 0;
  const nearLimit = !atLimit && (remaining ?? 5) <= 1;

  const barColor = atLimit
    ? "bg-destructive"
    : nearLimit
    ? "bg-amber-500"
    : "bg-primary";

  const borderColor = atLimit
    ? "border-destructive/30 bg-destructive/5"
    : nearLimit
    ? "border-amber-300/50 bg-amber-50/50"
    : "border-border bg-muted/30";

  return (
    <div className={`rounded-xl border px-4 py-3 ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {atLimit ? (
            <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          ) : nearLimit ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {atLimit
                ? "Limite mensal atingido"
                : `${used} de ${limit} cálculos utilizados este mês`}
            </p>

            {atLimit ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Seus {limit} cálculos gratuitos acabaram.{" "}
                <Link href="/pricing" className="text-primary underline font-medium">
                  Faça upgrade para PRO →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {remaining} restante{remaining !== 1 ? "s" : ""} • Plano Gratuito •{" "}
                <Link href="/pricing" className="text-primary underline">
                  Upgrade para ilimitado
                </Link>
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
