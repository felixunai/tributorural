"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const RETRY_DELAYS = [0, 2000, 4000, 6000, 10000]; // ms between attempts

export function UpgradeSuccessRefresher() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;

    router.replace("/dashboard");

    const toastId = toast.loading("Confirmando pagamento...");

    (async () => {
      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        }

        try {
          const res = await fetch("/api/subscription/sync", { method: "POST" });
          const data = await res.json();

          if (data.planTier && data.planTier !== "FREE") {
            // DB updated — rewrite JWT cookie directly (bypasses unreliable update())
            await fetch("/api/subscription/activate", { method: "POST" });
            await new Promise((r) => setTimeout(r, 300));
            toast.success("Plano atualizado! Bem-vindo ao PRO.", { id: toastId });
            window.location.replace("/dashboard");
            return;
          }
        } catch {
          // Network error — keep retrying
        }
      }

      // Exhausted retries — still try to activate in case DB is ahead of sync response
      await fetch("/api/subscription/activate", { method: "POST" }).catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
      toast.info("Pagamento recebido. Se o plano não atualizar, faça login novamente.", { id: toastId, duration: 8000 });
      window.location.replace("/dashboard");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
