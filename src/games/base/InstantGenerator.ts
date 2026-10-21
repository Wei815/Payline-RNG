/**
 * MathID 即時產生器介面
 *
 * 不靠反向搜尋滾輪表，而是直接依規則擺出盤面並轉成 MathID（決戰賽特2 / 奢華 / 諸神）。
 * 遊戲透過 manifest.instantGenerator 掛上自己的產生器。
 */
import type { PaytableRule, GameType, MultiplierInterval, SpecialSymbolConfig } from '../../types';

export interface GeneratorCombination {
  name: string;
  length: number;
  wildCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rng: any[] | null;
  isInterfered: boolean;
  hasS1Drop?: boolean;
  stripId?: number;
  allRngs?: number[][];
}

export interface GeneratorSearchParams {
  selectedSymbol: string;
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  currentPaytable: PaytableRule[];
  gameType: GameType;
  topTrackerOther: string[];
  specialSymbolConfig: SpecialSymbolConfig;
  customPaylines?: number[][];
  isFreeGame: boolean;
  bet: number;
  multiplierIntervals: MultiplierInterval[];
  stripSets?: Record<string, string[][]>;
}

export interface InstantGeneratorParams extends GeneratorSearchParams {
  /** 目標符號最少 / 最多中獎個數（依賠率表推算） */
  minWinCount: number;
  maxWinCount: number;
  startLen: number;
}

export interface InstantGenerator {
  /** 選定符號的組合清單 */
  combos(params: InstantGeneratorParams): GeneratorCombination[];
  /** 大獎區間組合；未實作則使用通用的滾輪表反向搜尋 */
  multiplierIntervals?(params: GeneratorSearchParams, validIntervals: MultiplierInterval[]): GeneratorCombination[];
}
