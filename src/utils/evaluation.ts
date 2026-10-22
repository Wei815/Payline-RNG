import type { PaytableRule, GameType, GameConfig } from '../types';
import { GameRegistry } from '../core/GameRegistry';

export interface WinResult {
  symbolId: string;
  matchCount: number;
  ways: number;
  payout: number;
  totalWin: number;
  lineIndex?: number; // 記錄 linegame 中獎的贏分線索引
  multiplier?: number; // 記錄倍數（如金框加成的倍數）
  isJackpot?: boolean; // 標記是否為大獎，以區分計算邏輯
  betScaled?: boolean; // totalWin 已乘上總投注（B1/B2/S1/S2 以總投注計），顯示時不可再乘 bet/coin
}

/** 畫面顯示的贏分：一般中獎以 coin 計，需乘 bet/coin；已乘總投注的中獎（B1/B2、Jackpot）直接使用 */
export function displayWin(w: WinResult, betMultiplier: number): number {
  return w.betScaled || w.isJackpot ? w.totalWin : w.totalWin * betMultiplier;
}

// 內建的 20 條中獎線，對應 3x5 盤面
export const defaultPaylines = [
  [1, 1, 1, 1, 1], // 中間水平
  [0, 0, 0, 0, 0], // 上方水平
  [2, 2, 2, 2, 2], // 下方水平
  [0, 1, 2, 1, 0], // V 字
  [2, 1, 0, 1, 2], // 倒 V 字
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 0, 2, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1]
];

export function evaluateGrid(
  grid: string[][],
  paytable: PaytableRule[],
  gameConfigOrType: GameType | GameConfig = 'waygame',
  paylines: number[][] = defaultPaylines,
  includeZeroPayout = false
): WinResult[] {
  // Backwards compatibility layer for legacy calls
  const gameConfig: GameConfig = typeof gameConfigOrType === 'string' 
    ? { gameType: gameConfigOrType, paylines }
    : gameConfigOrType;

  const actualPaylines = (typeof gameConfigOrType !== 'string' && gameConfigOrType.paylines && gameConfigOrType.paylines.length > 0) 
    ? gameConfigOrType.paylines 
    : paylines;

  const game = GameRegistry.getGame(gameConfig.gameType);
  return game.evaluate(grid, paytable, gameConfig, actualPaylines, includeZeroPayout);
}

export * from './evaluation/WinningPositions';
