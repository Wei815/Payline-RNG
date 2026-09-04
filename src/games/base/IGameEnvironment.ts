import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';

export interface IGameEnvironment {
  readonly id: GameType;
  readonly name: string;
  hasCascadeFeature?(): boolean;
  getDefaultConfig(): GameConfig;
  getDefaultPaytable(): PaytableRule[];
  getDefaultReelStrips(): ReelStrips;
  evaluate(grid: string[][], paytable: PaytableRule[], config: GameConfig, customPaylines?: number[][], includeZeroPayout?: boolean): WinResult[];
  
  isSymbolUnremovable?(sym: string, isFreeGame: boolean): boolean;

  calculateNextDropGrid(
    currentGrid: string[][],
    winningCoords: Map<string, number[]>,
    isFreeGame: boolean,
    pullNextSymbol: (colIndex: number, dropIndex: number, totalDropped: number) => string
  ): string[][];

  getTumbleMultiplier(cascadeCount: number, isFreeGame: boolean): number;

  findRngForCombos(
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame?: boolean,
    stripSets?: Record<string, string[][]>
  ): Promise<(number[] | null)[]>;

  findRngForCombination(
    targetSymbol: string,
    length: number,
    wildCount: number,
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame?: boolean,
    stripSets?: Record<string, string[][]>,
    requireGoldCascade?: boolean
  ): Promise<{ rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean; stripId?: number }>;

  findRngForMultiplierIntervals(
    intervals: import('../../types').MultiplierInterval[],
    bet: number,
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame?: boolean,
    stripSets?: Record<string, string[][]>
  ): Promise<Record<string, number[]>>;
}
