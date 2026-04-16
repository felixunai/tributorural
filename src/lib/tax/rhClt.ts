export interface RhCltInput {
  grossSalary: number;
  ratFapRate: number; // 0.01, 0.02, or 0.03
}

export interface RhBreakdownItem {
  label: string;
  amount: number;
  rate: number;
  color: string;
}

export interface RhCltResult {
  grossSalary: number;
  inssPatronal: number;
  fgts: number;
  decimoTerceiro: number;
  feriasComUmTerco: number;
  ratFap: number;
  sistemaS: number;
  totalEncargos: number;
  totalMonthlyCost: number;
  encargosPercentage: number;
  breakdown: RhBreakdownItem[];
  // Net salary (employee perspective)
  inssEmpregado: number;
  irrfEmpregado: number;
  salarioLiquido: number;
}

// Sistema S breakdown: SENAI 1% + SESI 1.5% + SEBRAE 0.6% + INCRA 0.2% = 3.3%
const SISTEMA_S_RATE = 0.033;

/**
 * INSS empregado – tabela progressiva 2024
 */
export function calcInssEmpregado(salary: number): number {
  const faixas = [
    { ate: 1412.00,   rate: 0.075 },
    { ate: 2666.68,   rate: 0.09  },
    { ate: 4000.03,   rate: 0.12  },
    { ate: 7786.02,   rate: 0.14  },
  ];

  let inss = 0;
  let prevLimit = 0;
  for (const faixa of faixas) {
    if (salary <= prevLimit) break;
    const base = Math.min(salary, faixa.ate) - prevLimit;
    inss += base * faixa.rate;
    prevLimit = faixa.ate;
    if (salary <= faixa.ate) break;
  }
  // Teto: se salário > 7.786,02, calcula só até o teto
  return Math.min(inss, 908.86);
}

/**
 * IRRF – tabela 2024 (sem dependentes)
 * Base = salário bruto − INSS empregado
 */
export function calcIrrfEmpregado(grossSalary: number, inssEmpregado: number): number {
  const base = grossSalary - inssEmpregado;
  if (base <= 2259.20) return 0;
  if (base <= 2826.65) return base * 0.075 - 169.44;
  if (base <= 3751.05) return base * 0.15  - 381.44;
  if (base <= 4664.68) return base * 0.225 - 662.77;
  return base * 0.275 - 896.00;
}

export function calculateRhClt(input: RhCltInput): RhCltResult {
  const { grossSalary: s, ratFapRate } = input;

  // Employer costs
  const inssPatronal      = s * 0.20;
  const fgts              = s * 0.08;
  const decimoTerceiro    = s * (1 / 12);
  const feriasComUmTerco  = s * (1 / 12) * (4 / 3);
  const ratFap            = s * ratFapRate;
  const sistemaS          = s * SISTEMA_S_RATE;

  const totalEncargos     = inssPatronal + fgts + decimoTerceiro + feriasComUmTerco + ratFap + sistemaS;
  const totalMonthlyCost  = s + totalEncargos;
  const encargosPercentage = s > 0 ? totalEncargos / s : 0;

  // Employee net salary
  const inssEmpregado = calcInssEmpregado(s);
  const irrfEmpregado = Math.max(0, calcIrrfEmpregado(s, inssEmpregado));
  const salarioLiquido = s - inssEmpregado - irrfEmpregado;

  const breakdown: RhBreakdownItem[] = [
    { label: "Salário Bruto",         amount: s,               rate: 1.0,                  color: "#6366f1" },
    { label: "INSS Patronal (20%)",   amount: inssPatronal,    rate: 0.20,                 color: "#3b82f6" },
    { label: "FGTS (8%)",             amount: fgts,            rate: 0.08,                 color: "#10b981" },
    { label: "13° Salário (8,33%)",   amount: decimoTerceiro,  rate: 1 / 12,               color: "#f59e0b" },
    { label: "Férias + 1/3 (11,11%)", amount: feriasComUmTerco,rate: (1 / 12) * (4 / 3),  color: "#f97316" },
    { label: `RAT/FAP (${(ratFapRate * 100).toFixed(0)}%)`, amount: ratFap, rate: ratFapRate, color: "#ef4444" },
    { label: "Sistema S (3,3%)",      amount: sistemaS,        rate: SISTEMA_S_RATE,       color: "#8b5cf6" },
  ];

  return {
    grossSalary: s,
    inssPatronal,
    fgts,
    decimoTerceiro,
    feriasComUmTerco,
    ratFap,
    sistemaS,
    totalEncargos,
    totalMonthlyCost,
    encargosPercentage,
    breakdown,
    inssEmpregado,
    irrfEmpregado,
    salarioLiquido,
  };
}
