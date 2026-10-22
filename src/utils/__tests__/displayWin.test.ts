/**
 * 贏分顯示：B1 / B2 / S1 / S2 在評估時已乘總投注，畫面不可再乘 bet/coin（曾顯示成 bet² 倍）
 */
import { describe, expect, test } from 'vitest';
import { defaultPaylines, displayWin, evaluateGrid } from '../evaluation';
import type { PaytableRule } from '../../types';

const rule = (symbolId: string, match3: number, isScatter = false): PaytableRule => ({
  symbolId, name: symbolId, payouts: { match3, match4: 0, match5: 0 }, isWild: false, isScatter,
});

describe('displayWin', () => {
  // 中間列：B1 B1 B1 在第 0~2 軸、M1 M1 M1 在上方列
  const grid = [
    ['M1', 'B1', 'Q'],
    ['M1', 'B1', 'K'],
    ['M1', 'B1', 'Q'],
    ['J', 'A', 'K'],
    ['A', 'J', 'Q'],
  ];
  const bet = 50;
  const betMultiplier = bet / 1; // coin = 1
  const wins = evaluateGrid(grid, [rule('M1', 10), rule('B1', 2)], { gameType: 'linegame', paylines: defaultPaylines, effectiveBet: bet });

  test('B1 以總投注計，只乘一次', () => {
    const b1 = wins.find(w => w.symbolId === 'B1')!;
    expect(b1.betScaled).toBe(true);
    expect(b1.totalWin).toBe(2 * bet);
    expect(displayWin(b1, betMultiplier)).toBe(2 * bet);
  });

  test('一般連線以 coin 計，顯示時乘 bet/coin', () => {
    const m1 = wins.find(w => w.symbolId === 'M1')!;
    expect(m1.betScaled).toBeUndefined();
    expect(displayWin(m1, betMultiplier)).toBe(10 * betMultiplier);
  });
});
