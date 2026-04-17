import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_INSS, DEFAULT_IRRF } from "./taxConfig";
import type { InssConfig, IrrfConfig, TaxConfig } from "./taxConfig";

export type { InssConfig, IrrfConfig, TaxConfig };

let _inss: InssConfig | null = null;
let _irrf: IrrfConfig | null = null;

export function invalidateTaxCache() {
  _inss = null;
  _irrf = null;
}

export async function getActiveInssConfig(): Promise<InssConfig> {
  if (_inss) return _inss;
  const row = await (prisma as any).taxBracket.findFirst({
    where: { type: "INSS_EMPLOYEE", isActive: true },
    orderBy: { effectiveDate: "desc" },
  });
  _inss = row ? (row.data as InssConfig) : DEFAULT_INSS;
  return _inss!;
}

export async function getActiveIrrfConfig(): Promise<IrrfConfig> {
  if (_irrf) return _irrf;
  const row = await (prisma as any).taxBracket.findFirst({
    where: { type: "IRRF_MONTHLY", isActive: true },
    orderBy: { effectiveDate: "desc" },
  });
  _irrf = row ? (row.data as IrrfConfig) : DEFAULT_IRRF;
  return _irrf!;
}

export async function getActiveTaxConfig(): Promise<TaxConfig> {
  const [inss, irrf] = await Promise.all([getActiveInssConfig(), getActiveIrrfConfig()]);
  return { inss, irrf };
}
