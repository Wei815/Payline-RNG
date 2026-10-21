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

  /**
   * 免遊觸發序列（例：羅馬 BaseGame 連續消除 N 次觸發免遊）。
   * 有實作的遊戲，產生器會顯示免遊觸發面板，腳本前置此序列。
   */
  generateTriggerSequence?(
    targetCombo: number,
    baseStripSets?: string[][][],
    rowCounts?: number[],
    currentPaytable?: PaytableRule[],
    customPaylines?: number[][]
  ): Promise<number[][] | null>;

  /**
   * 找出讓遞補後 0 贏分的下一筆 RNG（連鎖消除遊戲的 QA 腳本需輸出「初始 + 遞補」兩筆，例：羅馬）。
   * 由遊戲自行決定用哪一組滾輪表遞補；stripSets 不適用時傳 undefined，改用 fallbackStrips。
   */
  findRefillRng?(
    grid: string[][],
    wins: WinResult[],
    paytable: PaytableRule[],
    opts: {
      stripSets?: Record<string, string[][]> | string[][][];
      fallbackStrips: string[][];
      rowCounts: number[];
      paylines?: number[][];
      maxAttempts?: number;
    }
  ): number[] | null;

  /** 共用 getWinningPositions() 計算完後，供遊戲加入專屬的中獎/消除座標（直接修改 winningCoords） */
  postProcessWinningPositions?(grid: string[][], wins: WinResult[], winningCoords: Map<string, number[]>): void;

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
