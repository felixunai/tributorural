"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const RETRY_DELAYS = [0, 2000, 4000, 6000, 10000]; // ms between attempts

export function UpgradeSuccessRefresher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;

    router.replace("/dashboard");

    const toastId = toast.loading("Confirmando pagamento...");

    (async () => {
      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        // Wait before this attempt (first attempt is immediate)
        if (RETRY_DELAYS[attempt] > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        }

        try {
          const res = await fetch("/api/subscription/sync", { method: "POST" });
          const data = await res.json();

          if (data.planTier && data.planTier !== "FREE") {
            // DB updated — refresh JWT and reload
            await update();
            toast.success("Plano atualizado! Bem-vindo ao PRO.", { id: toastId });
            window.location.replace("/dashboard");
            return;
          }
        } catch {
          // Network error — keep retrying
        }
      }

      // Exhausted retries — refresh anyway (webhook may still arrive)
      await update();
      toast.info("Pagamento recebido. Se o plano não atualizar, faça login novamente.", { id: toastId, duration: 8000 });
      window.location.replace("/dashboard");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
