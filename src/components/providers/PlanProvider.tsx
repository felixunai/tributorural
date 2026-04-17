"use client";

import { createContext, useContext } from "react";
import type { PlanTier } from "@/types/prisma";

const PlanContext = createContext<PlanTier>("FREE");

export function PlanProvider({
  planTier,
  children,
}: {
  planTier: PlanTier;
  children: React.ReactNode;
}) {
  return <PlanContext.Provider value={planTier}>{children}</PlanContext.Provider>;
}

export function usePlanTier(): PlanTier {
  return useContext(PlanContext);
}
