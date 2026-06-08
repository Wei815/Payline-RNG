export interface PaytableRule {
  symbolId: string;
  name: string;
  payouts: { match2: number; match3: number; match4: number; match5: number; };
  isWild: boolean;
  isScatter: boolean;
}

export type GameType = 'waygame' | 'megaway' | 'payanywhere' | 'linegame';

export type ReelStrips = string[][];

export interface SymbolMetric {
  symbolId: string;
  hits2: number;
  hits3: number;
  hits4: number;
  hits5: number;
  totalPayout: number;
  contributionRTP: number;
}

export interface SimulationResult {
  totalSpins: number;
  overallRTP: number;
  hitFrequency: number;
  symbolMetrics: Record<string, SymbolMetric>;
}
