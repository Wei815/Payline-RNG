export interface PaytableRule {
  symbolId: string;
  name: string;
  payouts: { match2: number; match3: number; match4: number; match5: number; match6?: number; };
  isWild: boolean;
  isScatter: boolean;
  mathId?: string | number;
  isEnabled?: boolean;
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

export interface SpecialSymbolConfig {
  s1Enabled: boolean;
  s1Count: number; // 0-3
  s2Enabled: boolean;
  s2Count: number; // 0-3
  multipliersEnabled: boolean;
  multiplierCounts: Record<string, number>; // key: e.g. "F1_2X", value: count
  luckyBallsEnabled: boolean;
  luckyCounts: Record<string, number>; // key: e.g. "L1_2X", value: count
}

export interface GameConfig {
  gameType: GameType;
  paylines?: number[][];
  wildSymbols?: string[];
  effectiveBet?: number; // Added for B1/B2 base bet multiplication
  specialRules?: {
    derivativeSymbols?: Record<string, string[]>; // e.g. { 'B1': ['B2'] }
    payAnywhereThresholds?: { match3: number; match4: number; match5: number };
    scatterMinCount?: number;
    scatterAutoWinCount?: number;
  };
}
