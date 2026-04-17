export interface InssBracket { upTo: number; rate: number; }
export interface IrrfBracket { upTo: number | null; rate: number; deduction: number; }

export interface InssConfig { brackets: InssBracket[]; ceiling: number; }
export interface IrrfConfig {
  brackets: IrrfBracket[];
  abatimentoLimit: number;
  abatimentoPhaseout: number;
}
export interface TaxConfig { inss: InssConfig; irrf: IrrfConfig; }

// Hardcoded defaults (2025/2026)
export const DEFAULT_INSS: InssConfig = {
  brackets: [
    { upTo: 1518.00, rate: 0.075 },
    { upTo: 2793.88, rate: 0.09  },
    { upTo: 4190.83, rate: 0.12  },
    { upTo: 8157.41, rate: 0.14  },
  ],
  ceiling: 951.62,
};

export const DEFAULT_IRRF: IrrfConfig = {
  brackets: [
    { upTo: 2824.00,  rate: 0,     deduction: 0       },
    { upTo: 3751.05,  rate: 0.075, deduction: 211.80  },
    { upTo: 4664.68,  rate: 0.15,  deduction: 493.12  },
    { upTo: 5625.28,  rate: 0.225, deduction: 843.57  },
    { upTo: null,     rate: 0.275, deduction: 1125.59 },
  ],
  abatimentoLimit: 5000.00,
  abatimentoPhaseout: 7000.00,
};
