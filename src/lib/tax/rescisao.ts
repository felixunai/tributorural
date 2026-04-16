import { differenceInMonths, differenceInCalendarDays, getDaysInMonth } from "date-fns";
import { calcInssEmpregado, calcIrrfEmpregado } from "./rhClt";

export type TipoRescisao =
  | "SEM_JUSTA_CAUSA"
  | "COM_JUSTA_CAUSA"
  | "PEDIDO_DEMISSAO"
  | "ACORDO_MUTUO";

export interface RescisaoInput {
  grossSalary: number;
  admissionDate: string;         // ISO date "YYYY-MM-DD"
  terminationDate: string;       // ISO date "YYYY-MM-DD"
  tipoRescisao: TipoRescisao;
  avisoPrevioTrabalhado: boolean;
  feriasVencidasPeriodos: number; // 0, 1 or 2 completed vacation periods not taken
  fgtsBalance?: number;           // Total FGTS accumulated (optional)
}

export interface RescisaoItemResult {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
  description: string;
}

export interface RescisaoResult {
  grossSalary: number;
  tipoRescisao: TipoRescisao;

  // Service info
  anosCompletos: number;
  mesesNoPeriodo: number;
  diasAvisoPrevio: number;
  diasTrabalhadosNoMes: number;

  // Earnings
  saldoSalario: number;
  avisoPrevioIndenizado: number;
  decimoTerceiroProporcional: number;
  feriasPropcionais: number;
  feriasVencidas: number;
  fgtsRescisao: number;
  multaFgts: number;

  // Deductions
  inssEmpregado: number;
  irrfEmpregado: number;
  descontoAvisoPrevio: number;

  // Totals
  totalBruto: number;
  totalDescontos: number;
  totalLiquido: number;

  items: RescisaoItemResult[];
}

export function calcRescisao(input: RescisaoInput): RescisaoResult {
  const {
    grossSalary: s,
    admissionDate,
    terminationDate,
    tipoRescisao,
    avisoPrevioTrabalhado,
    feriasVencidasPeriodos,
    fgtsBalance,
  } = input;

  const admission    = new Date(admissionDate);
  const termination  = new Date(terminationDate);

  // ── Service time ──────────────────────────────────────────────
  const totalMonths  = differenceInMonths(termination, admission);
  const anosCompletos = Math.floor(totalMonths / 12);

  // Dias trabalhados no mês da demissão (saldo de salário)
  const diasTrabalhadosNoMes = termination.getDate();
  const diasNoMes = getDaysInMonth(termination);

  // Meses trabalhados no ano corrente (para 13° prop.)
  // Conta de janeiro (ou mês de admissão se mesmo ano) até o mês da demissão
  let mesesNoAnoCorrente: number;
  if (admission.getFullYear() === termination.getFullYear()) {
    mesesNoAnoCorrente = termination.getMonth() - admission.getMonth() + 1;
  } else {
    mesesNoAnoCorrente = termination.getMonth() + 1; // Jan=0, Dec=11
  }
  mesesNoAnoCorrente = Math.max(1, Math.min(12, mesesNoAnoCorrente));

  // Meses no período aquisitivo atual (para férias prop.)
  // Último aniversário da admissão
  let lastAnniversary = new Date(termination.getFullYear(), admission.getMonth(), admission.getDate());
  if (lastAnniversary > termination) {
    lastAnniversary.setFullYear(termination.getFullYear() - 1);
  }
  const mesesNoPeriodo = Math.min(12, differenceInMonths(termination, lastAnniversary));

  // ── Aviso prévio (Lei 12.506/2011) ────────────────────────────
  const diasAvisoPrevio = Math.min(90, 30 + anosCompletos * 3);
  const valorAvisoPrevio = (s / 30) * diasAvisoPrevio;

  // ── Calculate each component ─────────────────────────────────

  // 1. Saldo de salário
  const saldoSalario = (s / diasNoMes) * diasTrabalhadosNoMes;

  // 2. Aviso prévio indenizado
  let avisoPrevioIndenizado = 0;
  if (!avisoPrevioTrabalhado) {
    if (tipoRescisao === "SEM_JUSTA_CAUSA") {
      avisoPrevioIndenizado = valorAvisoPrevio;
    } else if (tipoRescisao === "ACORDO_MUTUO") {
      avisoPrevioIndenizado = valorAvisoPrevio / 2;
    }
  }

  // 3. 13° proporcional
  let decimoTerceiroProporcional = 0;
  if (tipoRescisao !== "COM_JUSTA_CAUSA") {
    decimoTerceiroProporcional = (s / 12) * mesesNoAnoCorrente;
  }

  // 4. Férias proporcionais + 1/3
  let feriasPropcionais = 0;
  if (tipoRescisao !== "COM_JUSTA_CAUSA" && mesesNoPeriodo > 0) {
    feriasPropcionais = ((s / 12) * mesesNoPeriodo) * (4 / 3);
  }

  // 5. Férias vencidas + 1/3
  const feriasVencidas = feriasVencidasPeriodos > 0
    ? s * (4 / 3) * feriasVencidasPeriodos
    : 0;

  // 6. FGTS sobre verbas (8%)
  // Base: saldo salário + aviso prévio + 13° prop (não incide sobre férias)
  let fgtsRescisao = 0;
  if (tipoRescisao !== "COM_JUSTA_CAUSA") {
    const baseFgts = saldoSalario + avisoPrevioIndenizado + decimoTerceiroProporcional;
    fgtsRescisao = baseFgts * 0.08;
  }

  // 7. Multa FGTS
  let multaFgts = 0;
  const estimatedFgtsBalance = fgtsBalance ?? s * 0.08 * totalMonths;
  if (tipoRescisao === "SEM_JUSTA_CAUSA") {
    multaFgts = estimatedFgtsBalance * 0.40;
  } else if (tipoRescisao === "ACORDO_MUTUO") {
    multaFgts = estimatedFgtsBalance * 0.20;
  }

  // 8. Desconto aviso prévio (pedido demissão sem cumprir)
  let descontoAvisoPrevio = 0;
  if (tipoRescisao === "PEDIDO_DEMISSAO" && !avisoPrevioTrabalhado) {
    descontoAvisoPrevio = valorAvisoPrevio;
  }

  // 9. INSS e IRRF do empregado (incide sobre verbas salariais)
  const baseInss = saldoSalario + avisoPrevioIndenizado + decimoTerceiroProporcional;
  const inssEmpregado    = calcInssEmpregado(baseInss);
  const irrfEmpregado    = Math.max(0, calcIrrfEmpregado(baseInss, inssEmpregado));

  // ── Totals ────────────────────────────────────────────────────
  const totalBruto =
    saldoSalario +
    avisoPrevioIndenizado +
    decimoTerceiroProporcional +
    feriasPropcionais +
    feriasVencidas +
    fgtsRescisao +
    multaFgts;

  const totalDescontos = inssEmpregado + irrfEmpregado + descontoAvisoPrevio;
  const totalLiquido   = totalBruto - totalDescontos;

  // ── Breakdown items ───────────────────────────────────────────
  const items: RescisaoItemResult[] = [
    {
      label: "Saldo de salário",
      amount: saldoSalario,
      kind: "earning",
      description: `${diasTrabalhadosNoMes} dias trabalhados em ${diasNoMes} dias do mês`,
    },
  ];

  if (avisoPrevioIndenizado > 0) {
    items.push({
      label: "Aviso prévio indenizado",
      amount: avisoPrevioIndenizado,
      kind: "earning",
      description: `${diasAvisoPrevio} dias${tipoRescisao === "ACORDO_MUTUO" ? " (metade – acordo mútuo)" : ""}`,
    });
  }

  if (decimoTerceiroProporcional > 0) {
    items.push({
      label: "13° salário proporcional",
      amount: decimoTerceiroProporcional,
      kind: "earning",
      description: `${mesesNoAnoCorrente}/12 avos`,
    });
  }

  if (feriasPropcionais > 0) {
    items.push({
      label: "Férias proporcionais + 1/3",
      amount: feriasPropcionais,
      kind: "earning",
      description: `${mesesNoPeriodo}/12 avos + 1/3`,
    });
  }

  if (feriasVencidas > 0) {
    items.push({
      label: `Férias vencidas + 1/3`,
      amount: feriasVencidas,
      kind: "earning",
      description: `${feriasVencidasPeriodos} período(s) não gozado(s)`,
    });
  }

  if (fgtsRescisao > 0) {
    items.push({
      label: "FGTS sobre rescisão (8%)",
      amount: fgtsRescisao,
      kind: "earning",
      description: "Depósito no FGTS sobre verbas rescisórias",
    });
  }

  if (multaFgts > 0) {
    items.push({
      label: `Multa FGTS (${tipoRescisao === "ACORDO_MUTUO" ? "20%" : "40%"})`,
      amount: multaFgts,
      kind: "earning",
      description: fgtsBalance
        ? `Sobre saldo informado de ${fgtsBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
        : "Saldo estimado (8% × meses trabalhados)",
    });
  }

  if (inssEmpregado > 0) {
    items.push({
      label: "INSS empregado",
      amount: -inssEmpregado,
      kind: "deduction",
      description: "Desconto INSS do empregado (tabela progressiva)",
    });
  }

  if (irrfEmpregado > 0) {
    items.push({
      label: "IRRF",
      amount: -irrfEmpregado,
      kind: "deduction",
      description: "Imposto de renda retido na fonte (tabela 2024)",
    });
  }

  if (descontoAvisoPrevio > 0) {
    items.push({
      label: "Desconto aviso prévio",
      amount: -descontoAvisoPrevio,
      kind: "deduction",
      description: "Aviso não cumprido (pedido de demissão)",
    });
  }

  return {
    grossSalary: s,
    tipoRescisao,
    anosCompletos,
    mesesNoPeriodo,
    diasAvisoPrevio,
    diasTrabalhadosNoMes,
    saldoSalario,
    avisoPrevioIndenizado,
    decimoTerceiroProporcional,
    feriasPropcionais,
    feriasVencidas,
    fgtsRescisao,
    multaFgts,
    inssEmpregado,
    irrfEmpregado,
    descontoAvisoPrevio,
    totalBruto,
    totalDescontos,
    totalLiquido,
    items,
  };
}
