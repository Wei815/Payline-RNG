/**
 * B2 算作 B1：未指定 specialRules 時也套用（搜尋引擎、驗證工具、消除掉落測試原本都沒傳，
 * 與畫面 / 測案公式算出的 B1 個數不同）
 */
import { describe, expect, test } from 'vitest';
import { evaluateGrid } from '../evaluation';
import type { GameType, PaytableRule } from '../../types';

const paytable: PaytableRule[] = [
  { symbolId: 'B1', name: 'B1', payouts: { match3: 2, match4: 5, match5: 10 }, isWild: false, isScatter: true },
  { symbolId: 'B2', name: 'B2', payouts: {}, isWild: false, isScatter: false },
];
const grid = [['B1', 'Q', 'K'], ['J', 'B2', 'A'], ['B1', 'K', 'Q'], ['A', 'B1', 'Q'], ['K', 'Q', 'J']];

describe.each(['waygame', 'linegame'] as GameType[])('%s', (gameType) => {
  test('不傳 specialRules 時 B1 × 3 + B2 = B1 × 4', () => {
    const b1 = evaluateGrid(grid, paytable, { gameType, paylines: [] }, undefined, false).find(w => w.symbolId === 'B1');
    expect(b1?.matchCount).toBe(4);
  });
});
