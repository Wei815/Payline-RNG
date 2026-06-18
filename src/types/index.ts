export interface PaytableRule {
  symbolId: string;
  name: string;
  payouts: { match2: number; match3: number; match4: number; match5: number; match6?: number; };
  isWild: boolean;
  isScatter: boolean;
  mathId?: string | number;
}

export type GameType = 'waygame' | 'megaway' | 'payanywhere' | 'payanywhere_set2' | 'linegame';

export type ReelStrips = string[][];

export interface SymbolMetric {
  symbolId: string;
  hits2: number;
  hits3: number;
  hits4: number;
  hits5: number;
  hits6?: number;
  totalPayout: number;
  contributionRTP: number;
  [key: string]: any;
}

export interface SimulationResult {
  totalSpins: number;
  overallRTP: number;
  hitFrequency: number;
  symbolMetrics: Record<string, SymbolMetric>;
  paylineCount: number;   // 實際使用幾條線
  effectiveBet: number;   // 有效每 spin 投注額 (BET)
  gameType: string;
}
