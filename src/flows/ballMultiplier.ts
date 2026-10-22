/**
 * 盤面倍數球（traits.multiplierBalls：決戰賽特2、通用 Pay Anywhere）
 *
 * 規格（2026-10-22 確認）：盤面上所有 F、L 倍數球的值加總，乘在該局「全部贏分」上（含 B1 / B2）。
 * 盤面沒有倍數球時倍數為 1。
 *
 * 線遊戲（例如奢華）的 F/L 是「經過的線才加乘」，已在 LineGameStrategy 逐線計算，不適用此處。
 * 曾經產生器只加總 F 球、自定義盤面加總 F + L、測案 Win= 完全不乘，三處結果不同。
 */
import type { GameType } from '../types';
import { findTraits } from '../games/registry';

/** 盤面上 F/L 倍數球（例如 F1_5X、L2_10X）的值加總；沒有則為 0 */
export function sumBallValues(grid: string[][]): number {
  let sum = 0;
  for (const col of grid) {
    for (const sym of col) {
      if (!/^[FL][1-4]_\d+X$/.test(sym)) continue;
      sum += parseInt(sym.split('_')[1], 10);
    }
  }
  return sum;
}

/** 該局贏分要乘的盤面倍數（不適用的遊戲或沒有倍數球時為 1） */
export function boardBallMultiplier(gameType: GameType | string, grid: string[][]): number {
  if (!findTraits(gameType)?.multiplierBalls) return 1;
  return Math.max(1, sumBallValues(grid));
}
