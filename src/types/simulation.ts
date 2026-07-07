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
