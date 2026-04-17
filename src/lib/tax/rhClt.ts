import type { InssConfig, IrrfConfig } from "./taxConfig";

export interface RhCltInput { grossSalary: number; ratFapRate: number; }
export interface RhBreakdownItem { label: string; amount: number; rate: number; color: string; }
export interface RhCltResult {
  grossSalary: number; inssPatronal: number; fgts: number; decimoTerceiro: number;
  feriasComUmTerco: number; ratFap: number; sistemaS: number; totalEncargos: number;
  totalMonthlyCost: number; encargosPercentage: number; breakdown: RhBreakdownItem[];
  inssEmpregado: number; irrfEmpregado: number; salarioLiquido: number;
}

const SISTEMA_S_RATE = 0.033;

import { DEFAULT_INSS, DEFAULT_IRRF } from "./taxConfig";

/**
 * INSS empregado — tabela progressiva
 * Default: 2025 (Portaria MPS 1.284/2024, SM R$1.518, teto R$951,62)
 */
export function calcInssEmpregado(salary: number, cfg?: InssConfig): number {
  if (salary <= 0) return 0;
  const { brackets, ceiling } = cfg ?? DEFAULT_INSS;
  let inss = 0;
  let prev = 0;
  for (const f of brackets) {
    if (salary <= prev) break;
    inss += (Math.min(salary, f.upTo) - prev) * f.rate;
    prev = f.upTo;
    if (salary <= f.upTo) break;
  }
  return Math.min(inss, ceiling);
}

/**
 * IRRF mensal empregado — tabela progressiva + abatimento complementar
 * Default: 2026 (Lei 15.079/2025) — isenção efetiva até R$5.000
 * Abatimento: 100% em R$5.000, linear até 0% em R$7.000
 */
export function calcIrrfEmpregado(grossSalary: number, inssEmpregado: number, cfg?: IrrfConfig): number {
  const base = grossSalary - inssEmpregado;
  if (base <= 0) return 0;
  const { brackets, abatimentoLimit, abatimentoPhaseout } = cfg ?? DEFAULT_IRRF;

  // Progressive table
  let irrf = 0;
  for (const f of brackets) {
    if (f.upTo === null || base <= f.upTo) {
      irrf = base * f.rate - f.deduction;
      break;
    }
  }
  if (irrf <= 0) return 0;

  // Complementary abatimento
  if (base <= abatimentoLimit) return 0;
  if (base <= abatimentoPhaseout) {
    irrf = irrf * (base - abatimentoLimit) / (abatimentoPhaseout - abatimentoLimit);
  }
  return Math.max(0, irrf);
}

export function calculateRhClt(input: RhCltInput, cfg?: { inss?: InssConfig; irrf?: IrrfConfig }): RhCltResult {
  const { grossSalary: s, ratFapRate } = input;
  const inssPatronal     = s * 0.20;
  const fgts             = s * 0.08;
  const decimoTerceiro   = s * (1 / 12);
  const feriasComUmTerco = s * (1 / 12) * (4 / 3);
  const ratFap           = s * ratFapRate;
  const sistemaS         = s * SISTEMA_S_RATE;
  const totalEncargos    = inssPatronal + fgts + decimoTerceiro + feriasComUmTerco + ratFap + sistemaS;
  const totalMonthlyCost = s + totalEncargos;
  const encargosPercentage = s > 0 ? totalEncargos / s : 0;
  const inssEmpregado  = calcInssEmpregado(s, cfg?.inss);
  const irrfEmpregado  = Math.max(0, calcIrrfEmpregado(s, inssEmpregado, cfg?.irrf));
  const salarioLiquido = s - inssEmpregado - irrfEmpregado;
  const breakdown: RhBreakdownItem[] = [
    { label: "Salário Bruto",         amount: s,               rate: 1.0,                 color: "#6366f1" },
    { label: "INSS Patronal (20%)",   amount: inssPatronal,    rate: 0.20,                color: "#3b82f6" },
    { label: "FGTS (8%)",             amount: fgts,            rate: 0.08,                color: "#10b981" },
    { label: "13° Salário (8,33%)",   amount: decimoTerceiro,  rate: 1 / 12,              color: "#f59e0b" },
    { label: "Férias + 1/3 (11,11%)", amount: feriasComUmTerco,rate: (1/12)*(4/3),        color: "#f97316" },
    { label: `RAT/FAP (${(ratFapRate*100).toFixed(0)}%)`, amount: ratFap, rate: ratFapRate, color: "#ef4444" },
    { label: "Sistema S (3,3%)",      amount: sistemaS,        rate: SISTEMA_S_RATE,      color: "#8b5cf6" },
  ];
  return { grossSalary: s, inssPatronal, fgts, decimoTerceiro, feriasComUmTerco, ratFap, sistemaS,
    totalEncargos, totalMonthlyCost, encargosPercentage, breakdown, inssEmpregado, irrfEmpregado, salarioLiquido };
}
