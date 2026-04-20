export type RegimeVendedor =
  | "produtor-pf"      // Produtor rural PF — FUNRURAL 1,2% / PIS-COFINS 0% (Lei 10.925/2004)
  | "lucro-presumido"  // Empresa Lucro Presumido — sem FUNRURAL / PIS 0,65% / COFINS 3%
  | "lucro-real"       // Empresa Lucro Real — sem FUNRURAL / PIS 1,65% / COFINS 7,6%
  | "simples-nacional"; // Simples Nacional — PIS/COFINS incluídos no DAS / sem FUNRURAL

export type IcmsRegime =
  | "normal"   // Alíquota interestadual padrão (7% ou 12%)
  | "diferido" // ICMS diferido para etapa seguinte (0% na origem)
  | "isento";  // Operação isenta de ICMS (0%)

export interface RuralTaxInput {
  saleValue: number;
  icmsRate: number;        // alíquota interestadual do DB (0.07 ou 0.12)
  icmsRegime: IcmsRegime;
  pisRate: number;         // da tabela do produto (0% para in natura)
  cofinsRate: number;      // da tabela do produto (0% para in natura)
  funruralRate: number;    // do DB (1.2% PF ou 1.5% PJ)
  regimeVendedor: RegimeVendedor;
}

export interface TaxBreakdownItem {
  label: string;
  amount: number;
  rate: number;
  color: string;
}

export interface RuralTaxObservation {
  type: "warning" | "info";
  text: string;
}

export interface RuralTaxResult {
  saleValue: number;
  icmsAmount: number;
  pisAmount: number;
  cofinsAmount: number;
  funruralAmount: number;
  totalTax: number;
  effectiveRate: number;
  // Taxas efetivamente aplicadas (podem diferir das do DB por regime)
  icmsRateApplied: number;
  pisRateApplied: number;
  cofinsRateApplied: number;
  funruralRateApplied: number;
  icmsRegime: IcmsRegime;
  regimeVendedor: RegimeVendedor;
  breakdown: TaxBreakdownItem[];
  observations: RuralTaxObservation[];
}

// PIS/COFINS por regime para empresas (quando não produtor rural PF)
const EMPRESA_RATES: Record<string, { pis: number; cofins: number }> = {
  "lucro-presumido":  { pis: 0.0065, cofins: 0.03 },
  "lucro-real":       { pis: 0.0165, cofins: 0.076 },
  "simples-nacional": { pis: 0,      cofins: 0 }, // incluídos no DAS
};

export function calculateRuralTax(input: RuralTaxInput): RuralTaxResult {
  const { saleValue, icmsRate, icmsRegime, pisRate, cofinsRate, funruralRate, regimeVendedor } = input;

  // ── ICMS efetivo ──────────────────────────────────────────────────
  const icmsRateApplied = icmsRegime === "normal" ? icmsRate : 0;
  const icmsAmount = saleValue * icmsRateApplied;

  // ── PIS / COFINS efetivos ─────────────────────────────────────────
  let pisRateApplied: number;
  let cofinsRateApplied: number;

  if (regimeVendedor === "produtor-pf") {
    // Produtor rural PF: usa as alíquotas do produto (0% para in natura — Lei 10.925/2004)
    pisRateApplied    = pisRate;
    cofinsRateApplied = cofinsRate;
  } else {
    // Empresa: usa alíquotas do regime tributário
    pisRateApplied    = EMPRESA_RATES[regimeVendedor].pis;
    cofinsRateApplied = EMPRESA_RATES[regimeVendedor].cofins;
  }
  const pisAmount    = saleValue * pisRateApplied;
  const cofinsAmount = saleValue * cofinsRateApplied;

  // ── FUNRURAL efetivo ──────────────────────────────────────────────
  // Empresas não são produtores rurais — não recolhem FUNRURAL sobre receita bruta
  const funruralRateApplied = regimeVendedor === "produtor-pf" ? funruralRate : 0;
  const funruralAmount = saleValue * funruralRateApplied;

  // ── Totais ────────────────────────────────────────────────────────
  const totalTax    = icmsAmount + pisAmount + cofinsAmount + funruralAmount;
  const effectiveRate = saleValue > 0 ? totalTax / saleValue : 0;

  // ── Breakdown ─────────────────────────────────────────────────────
  const breakdown: TaxBreakdownItem[] = [
    { label: "ICMS", amount: icmsAmount, rate: icmsRateApplied, color: "#3b82f6" },
    { label: "PIS", amount: pisAmount, rate: pisRateApplied, color: "#10b981" },
    { label: "COFINS", amount: cofinsAmount, rate: cofinsRateApplied, color: "#f59e0b" },
    { label: "FUNRURAL", amount: funruralAmount, rate: funruralRateApplied, color: "#ef4444" },
  ].filter((item) => item.amount > 0 || item.rate > 0);

  // ── Observações contextuais ───────────────────────────────────────
  const observations: RuralTaxObservation[] = [];

  if (icmsRegime === "diferido") {
    observations.push({
      type: "info",
      text: "ICMS diferido: o imposto não é recolhido na origem. O recolhimento fica a cargo do adquirente na etapa seguinte da cadeia produtiva.",
    });
  }
  if (icmsRegime === "isento") {
    observations.push({
      type: "info",
      text: "ICMS isento: a operação está amparada por isenção prevista em convênio ICMS ou legislação estadual específica.",
    });
  }
  if (icmsRegime === "normal" && (icmsRate === 0.07 || icmsRate === 0.12)) {
    observations.push({
      type: "warning",
      text: `Atenção: produtos agrícolas in natura frequentemente têm ICMS diferido ou isento por convênios estaduais. Verifique o benefício fiscal aplicável antes de utilizar este cálculo como referência fiscal.`,
    });
  }

  if (regimeVendedor === "lucro-presumido" || regimeVendedor === "lucro-real") {
    observations.push({
      type: "warning",
      text: "Empresas que vendem produtos in natura podem ter suspensão de PIS/COFINS (Lei 10.925/2004, art. 9°). Verifique se a operação se enquadra antes de recolher as alíquotas indicadas.",
    });
  }
  if (regimeVendedor === "simples-nacional") {
    observations.push({
      type: "info",
      text: "Simples Nacional: PIS e COFINS são recolhidos via DAS e não incidem separadamente. O ICMS interestadual também é recolhido pelo DAS conforme tabela do Simples — a alíquota exibida é referencial.",
    });
  }

  observations.push({
    type: "info",
    text: "DIFAL: se o comprador for consumidor final não contribuinte do ICMS, pode haver incidência de Diferencial de Alíquota (DIFAL), não contemplado neste cálculo.",
  });

  return {
    saleValue,
    icmsAmount,
    pisAmount,
    cofinsAmount,
    funruralAmount,
    totalTax,
    effectiveRate,
    icmsRateApplied,
    pisRateApplied,
    cofinsRateApplied,
    funruralRateApplied,
    icmsRegime,
    regimeVendedor,
    breakdown,
    observations,
  };
}
