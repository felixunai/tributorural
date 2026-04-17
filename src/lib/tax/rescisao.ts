import { differenceInMonths, getDaysInMonth } from "date-fns";
import { calcInssEmpregado, calcIrrfEmpregado } from "./rhClt";
import type { InssConfig, IrrfConfig } from "./taxConfig";

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
  feriasVencidasPeriodos: number; // 0, 1 ou 2 períodos aquisitivos vencidos não gozados
  fgtsBalance?: number;           // Saldo FGTS acumulado (opcional; estimado se ausente)
}

export interface RescisaoItemResult {
  label: string;
  amount: number;
  kind: "earning" | "deduction" | "fgts";
  description: string;
}

export interface RescisaoResult {
  grossSalary: number;
  tipoRescisao: TipoRescisao;

  // Tempo de serviço
  anosCompletos: number;
  mesesNoPeriodo: number;
  diasAvisoPrevio: number;
  diasTrabalhadosNoMes: number;

  // Verbas pagas ao funcionário
  saldoSalario: number;
  avisoPrevioIndenizado: number;
  decimoTerceiroProporcional: number;
  feriasPropcionais: number;
  feriasVencidas: number;

  // Descontos
  inssEmpregado: number;
  irrfEmpregado: number;
  descontoAvisoPrevio: number;

  // Totais das verbas diretas (sem FGTS)
  totalBruto: number;
  totalDescontos: number;
  totalLiquido: number;

  // FGTS (depósito separado — não compõe o líquido)
  fgtsAcumulado: number;   // saldo do contrato (informado ou estimado)
  fgtsRescisao: number;    // 8% sobre aviso prévio + 13º
  multaFgts: number;       // 40% ou 20% sobre (acumulado + rescisório)
  fgtsTotal: number;       // total sacável pelo trabalhador

  items: RescisaoItemResult[];
}

export function calcRescisao(
  input: RescisaoInput,
  taxCfg?: { inss?: InssConfig; irrf?: IrrfConfig }
): RescisaoResult {
  const {
    grossSalary: s,
    admissionDate,
    terminationDate,
    tipoRescisao,
    avisoPrevioTrabalhado,
    feriasVencidasPeriodos,
    fgtsBalance,
  } = input;

  const admission   = new Date(admissionDate);
  const termination = new Date(terminationDate);

  // ── Tempo de serviço ──────────────────────────────────────────────
  const totalMonths   = differenceInMonths(termination, admission);
  const anosCompletos = Math.floor(totalMonths / 12);

  // Dias trabalhados no mês da demissão
  const diasTrabalhadosNoMes = termination.getDate();
  const diasNoMes = getDaysInMonth(termination);

  // Meses no ano corrente para 13º proporcional
  let mesesNoAnoCorrente: number;
  if (admission.getFullYear() === termination.getFullYear()) {
    mesesNoAnoCorrente = termination.getMonth() - admission.getMonth() + 1;
  } else {
    mesesNoAnoCorrente = termination.getMonth() + 1;
  }
  mesesNoAnoCorrente = Math.max(1, Math.min(12, mesesNoAnoCorrente));

  // Meses no período aquisitivo atual para férias proporcionais
  let lastAnniversary = new Date(termination.getFullYear(), admission.getMonth(), admission.getDate());
  if (lastAnniversary > termination) {
    lastAnniversary.setFullYear(termination.getFullYear() - 1);
  }
  const mesesNoPeriodo = Math.min(12, differenceInMonths(termination, lastAnniversary));

  // ── Aviso prévio (Lei 12.506/2011) ────────────────────────────────
  const diasAvisoPrevio  = Math.min(90, 30 + anosCompletos * 3);
  const valorAvisoPrevio = (s / 30) * diasAvisoPrevio;

  // ── Verbas rescisórias ────────────────────────────────────────────

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

  // 3. 13º proporcional
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

  // 6. Desconto aviso prévio (pedido de demissão sem cumprir)
  let descontoAvisoPrevio = 0;
  if (tipoRescisao === "PEDIDO_DEMISSAO" && !avisoPrevioTrabalhado) {
    descontoAvisoPrevio = valorAvisoPrevio;
  }

  // ── INSS e IRRF ───────────────────────────────────────────────────
  // Base INSS: saldo de salário + aviso prévio indenizado + 13º proporcional
  // Férias indenizadas (proporcionais + vencidas) são ISENTAS de INSS e IRRF
  // Aviso prévio indenizado é ISENTO de IRRF (IN RFB 1.500/2014, art. 5, I)
  const baseInss = saldoSalario + avisoPrevioIndenizado + decimoTerceiroProporcional;
  const inssEmpregado = calcInssEmpregado(baseInss, taxCfg?.inss);

  const irrfBase = saldoSalario + decimoTerceiroProporcional;
  const irrfBaseShare  = baseInss > 0 ? irrfBase / baseInss : 0;
  const inssDeductIrrf = inssEmpregado * irrfBaseShare;
  const irrfEmpregado  = Math.max(0, calcIrrfEmpregado(irrfBase, inssDeductIrrf, taxCfg?.irrf));

  // ── FGTS (depósito separado, não compõe o líquido pago ao funcionário) ──
  // Base FGTS rescisório: aviso prévio indenizado + 13º proporcional
  // NÃO incide sobre férias indenizadas nem sobre saldo de salário (já coberto mensalmente)
  let fgtsRescisao = 0;
  if (tipoRescisao !== "COM_JUSTA_CAUSA") {
    fgtsRescisao = (avisoPrevioIndenizado + decimoTerceiroProporcional) * 0.08;
  }

  // Saldo acumulado do contrato (informado ou estimado como 8% × salário × meses)
  const fgtsAcumulado = fgtsBalance ?? s * 0.08 * totalMonths;

  // Multa FGTS: 40% SEM_JUSTA_CAUSA, 20% ACORDO_MUTUO
  // Base = saldo acumulado + FGTS gerado na rescisão
  let multaFgts = 0;
  const fgtsBaseMulta = fgtsAcumulado + fgtsRescisao;
  if (tipoRescisao === "SEM_JUSTA_CAUSA") {
    multaFgts = fgtsBaseMulta * 0.40;
  } else if (tipoRescisao === "ACORDO_MUTUO") {
    multaFgts = fgtsBaseMulta * 0.20;
  }

  const fgtsTotal = fgtsAcumulado + fgtsRescisao + multaFgts;

  // ── Totais das verbas diretas (sem FGTS) ─────────────────────────
  const totalBruto =
    saldoSalario +
    avisoPrevioIndenizado +
    decimoTerceiroProporcional +
    feriasPropcionais +
    feriasVencidas;

  const totalDescontos = inssEmpregado + irrfEmpregado + descontoAvisoPrevio;
  const totalLiquido   = totalBruto - totalDescontos;

  // ── Detalhamento por item ─────────────────────────────────────────
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
      description: `${mesesNoPeriodo}/12 avos + 1/3 constitucional`,
    });
  }

  if (feriasVencidas > 0) {
    items.push({
      label: "Férias vencidas + 1/3",
      amount: feriasVencidas,
      kind: "earning",
      description: `${feriasVencidasPeriodos} período(s) não gozado(s)`,
    });
  }

  if (inssEmpregado > 0) {
    items.push({
      label: "INSS empregado",
      amount: -inssEmpregado,
      kind: "deduction",
      description: `Base: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(baseInss)} (saldo + aviso + 13°)`,
    });
  }

  if (irrfEmpregado > 0) {
    items.push({
      label: "IRRF",
      amount: -irrfEmpregado,
      kind: "deduction",
      description: "IRRF (tabela 2026 — Lei 15.079/2025)",
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

  // FGTS items — depósito separado, não reduz o líquido
  if (fgtsRescisao > 0) {
    items.push({
      label: "FGTS sobre rescisão (8%)",
      amount: fgtsRescisao,
      kind: "fgts",
      description: "Depósito: aviso prévio + 13° proporcional",
    });
  }

  if (multaFgts > 0) {
    items.push({
      label: `Multa FGTS (${tipoRescisao === "ACORDO_MUTUO" ? "20%" : "40%"})`,
      amount: multaFgts,
      kind: "fgts",
      description: fgtsBalance != null
        ? `Sobre saldo + rescisório (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fgtsBaseMulta)})`
        : `Saldo estimado + rescisório (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fgtsBaseMulta)})`,
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
    inssEmpregado,
    irrfEmpregado,
    descontoAvisoPrevio,
    totalBruto,
    totalDescontos,
    totalLiquido,
    fgtsAcumulado,
    fgtsRescisao,
    multaFgts,
    fgtsTotal,
    items,
  };
}
