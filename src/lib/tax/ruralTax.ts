export interface RuralTaxInput {
  saleValue: number;
  icmsRate: number;
  pisRate: number;
  cofinsRate: number;
  funruralRate: number;
}

export interface TaxBreakdownItem {
  label: string;
  amount: number;
  rate: number;
  color: string;
}

export interface RuralTaxResult {
  saleValue: number;
  icmsAmount: number;
  pisAmount: number;
  cofinsAmount: number;
  funruralAmount: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: TaxBreakdownItem[];
}

export function calculateRuralTax(input: RuralTaxInput): RuralTaxResult {
  const { saleValue, icmsRate, pisRate, cofinsRate, funruralRate } = input;

  const icmsAmount = saleValue * icmsRate;
  const pisAmount = saleValue * pisRate;
  const cofinsAmount = saleValue * cofinsRate;
  const funruralAmount = saleValue * funruralRate;
  const totalTax = icmsAmount + pisAmount + cofinsAmount + funruralAmount;
  const effectiveRate = saleValue > 0 ? totalTax / saleValue : 0;

  const breakdown: TaxBreakdownItem[] = [
    { label: "ICMS", amount: icmsAmount, rate: icmsRate, color: "#3b82f6" },
    { label: "PIS", amount: pisAmount, rate: pisRate, color: "#10b981" },
    { label: "COFINS", amount: cofinsAmount, rate: cofinsRate, color: "#f59e0b" },
    { label: "FUNRURAL", amount: funruralAmount, rate: funruralRate, color: "#ef4444" },
  ].filter((item) => item.amount > 0 || item.rate > 0);

  return {
    saleValue,
    icmsAmount,
    pisAmount,
    cofinsAmount,
    funruralAmount,
    totalTax,
    effectiveRate,
    breakdown,
  };
}
