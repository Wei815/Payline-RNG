export type GameType = 'waygame' | 'megaway' | 'payanywhere' | 'payanywhere_set2' | 'waygame_qin' | 'linegame' | 'linegame_set2';

export type ReelStrips = string[][];

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
  goldFrames?: Record<string, number>; // e.g. '0-0': 2
  jackpots?: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>; // e.g. '0-0': 'MINI'
  specialRules?: {
    derivativeSymbols?: Record<string, string[]>; // e.g. { 'B1': ['B2'] }
    payAnywhereThresholds?: { match3: number; match4: number; match5: number };
    scatterMinCount?: number;
    scatterAutoWinCount?: number;
    unremovableSymbols?: string[];
  };
}
