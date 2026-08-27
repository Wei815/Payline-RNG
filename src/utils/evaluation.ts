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

  const game = GameRegistry.getGame(gameConfig.gameType);
  return game.evaluate(grid, paytable, gameConfig, paylines, includeZeroPayout);
}

export * from './evaluation/WinningPositions';
