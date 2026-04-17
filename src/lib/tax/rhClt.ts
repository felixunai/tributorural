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

// Sistema S: SENAI 1% + SESI 1.5% + SEBRAE 0.6% + INCRA 0.2% = 3.3%
const SISTEMA_S_RATE = 0.033;

/**
 * INSS empregado — tabela progressiva 2025
 * Portaria MPS 1.284/2024, vigência 01/01/2025
 *
 * Faixas (salário mínimo 2025 = R$ 1.518,00):
 *   Até R$ 1.518,00         → 7,5%
 *   R$ 1.518,01–2.793,88    → 9%
 *   R$ 2.793,89–4.190,83    → 12%
 *   R$ 4.190,84–8.157,41    → 14%
 *
 * Teto máximo de contribuição: R$ 951,62/mês
 */
export function calcInssEmpregado(salary: number): number {
  if (salary <= 0) return 0;

  const faixas = [
    { ate: 1518.00, rate: 0.075 },
    { ate: 2793.88, rate: 0.09  },
    { ate: 4190.83, rate: 0.12  },
    { ate: 8157.41, rate: 0.14  },
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

  return Math.min(inss, 951.62); // teto 2025
}

/**
 * IRRF mensal empregado — tabela 2026 + abatimento complementar
 * Lei 15.079/2025 — isenção efetiva para base de cálculo ≤ R$ 5.000
 *
 * Tabela progressiva (base = salário bruto − INSS):
 *   Até R$ 2.824,00         → isento
 *   R$ 2.824,01–3.751,05    → 7,5%  − R$ 211,80
 *   R$ 3.751,06–4.664,68    → 15%   − R$ 493,12
 *   R$ 4.664,69–5.625,28    → 22,5% − R$ 843,57
 *   Acima de R$ 5.625,28    → 27,5% − R$ 1.125,59
 *
 * Abatimento complementar:
 *   Base ≤ R$ 5.000 → IRRF = 0 (isenção total)
 *   Base entre R$ 5.000 e R$ 7.000 → redução proporcional linear
 *   Base > R$ 7.000 → tabela progressiva integral
 *
 * @param grossSalary  salário bruto (ou base tributável bruta, ex: 13° / férias)
 * @param inssEmpregado  INSS já calculado a deduzir
 */
export function calcIrrfEmpregado(grossSalary: number, inssEmpregado: number): number {
  const base = grossSalary - inssEmpregado;
  if (base <= 0) return 0;

  // Tabela progressiva
  let irrf: number;
  if (base <= 2824.00)      irrf = 0;
  else if (base <= 3751.05) irrf = base * 0.075 - 211.80;
  else if (base <= 4664.68) irrf = base * 0.15  - 493.12;
  else if (base <= 5625.28) irrf = base * 0.225 - 843.57;
  else                      irrf = base * 0.275 - 1125.59;

  if (irrf <= 0) return 0;

  // Abatimento complementar (Lei 15.079/2025)
  if (base <= 5000.00) return 0;
  if (base <= 7000.00) {
    // Redução linear: 100% de desconto em R$5.000, zero desconto em R$7.000
    irrf = irrf * (base - 5000.00) / 2000.00;
  }

  return Math.max(0, irrf);
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
  const inssEmpregado  = calcInssEmpregado(s);
  const irrfEmpregado  = Math.max(0, calcIrrfEmpregado(s, inssEmpregado));
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
