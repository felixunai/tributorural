"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function UpgradeSuccessRefresher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;

    router.replace("/dashboard");

    const id = toast.loading("Confirmando pagamento...");

    (async () => {
      // Sync subscription from Stripe directly — doesn't rely on webhook timing
      await fetch("/api/subscription/sync", { method: "POST" });

      // Refresh the JWT token so planTier is re-read from DB
      await update();

      toast.success("Plano atualizado! Bem-vindo ao PRO.", { id });

      // Full reload so all server components re-render with the new planTier
      window.location.replace("/dashboard");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
