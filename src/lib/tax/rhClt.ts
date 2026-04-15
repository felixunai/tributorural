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
}

// Sistema S breakdown: SENAI 1% + SESI 1.5% + SEBRAE 0.6% + INCRA 0.2% = 3.3%
const SISTEMA_S_RATE = 0.033;

export function calculateRhClt(input: RhCltInput): RhCltResult {
  const { grossSalary: s, ratFapRate } = input;

  const inssPatronal = s * 0.20;
  const fgts = s * 0.08;
  const decimoTerceiro = s * (1 / 12); // ~8.33% monthly provision
  const feriasComUmTerco = s * (1 / 12) * (4 / 3); // férias + 1/3 ~11.11%
  const ratFap = s * ratFapRate;
  const sistemaS = s * SISTEMA_S_RATE;

  const totalEncargos =
    inssPatronal + fgts + decimoTerceiro + feriasComUmTerco + ratFap + sistemaS;
  const totalMonthlyCost = s + totalEncargos;
  const encargosPercentage = s > 0 ? totalEncargos / s : 0;

  const breakdown: RhBreakdownItem[] = [
    { label: "Salário Bruto", amount: s, rate: 1.0, color: "#6366f1" },
    { label: "INSS Patronal (20%)", amount: inssPatronal, rate: 0.20, color: "#3b82f6" },
    { label: "FGTS (8%)", amount: fgts, rate: 0.08, color: "#10b981" },
    { label: "13° Salário (8,33%)", amount: decimoTerceiro, rate: 1 / 12, color: "#f59e0b" },
    { label: "Férias + 1/3 (11,11%)", amount: feriasComUmTerco, rate: (1 / 12) * (4 / 3), color: "#f97316" },
    { label: `RAT/FAP (${(ratFapRate * 100).toFixed(0)}%)`, amount: ratFap, rate: ratFapRate, color: "#ef4444" },
    { label: "Sistema S (3,3%)", amount: sistemaS, rate: SISTEMA_S_RATE, color: "#8b5cf6" },
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
  };
}
