/**
 * Scatter / 全盤消除中獎時，百搭不算中獎格（兩個策略都不把百搭算進個數）
 * 曾經盤面上所有 WX 都隨 Scatter 中獎一起被消除
 */
import { describe, expect, test } from 'vitest';
import { evaluateGrid, getWinningPositions, HIGHLIGHT_ONLY_INDEX } from '../evaluation';
import type { GameType, PaytableRule } from '../../types';

const paytable: PaytableRule[] = [
  { symbolId: 'B1', name: 'B1', payouts: { match3: 2, match4: 5, match5: 10 }, isWild: false, isScatter: true },
  { symbolId: 'WX', name: 'WX', payouts: {}, isWild: true, isScatter: false },
  { symbolId: 'A', name: 'A', payouts: { match3: 5, match4: 10, match5: 20 }, isWild: false, isScatter: false },
];
const grid = [['B1', 'Q', 'K'], ['J', 'B1', 'WX'], ['B1', 'K', 'Q'], ['WX', 'J', 'Q'], ['K', 'Q', 'J']];

describe.each(['waygame', 'linegame'] as GameType[])('%s Scatter 中獎', (gameType) => {
  test('只標 Scatter 本身，不標 WX', () => {
    const wins = evaluateGrid(grid, paytable, gameType, undefined, false);
    expect(wins.map(w => w.symbolId)).toContain('B1');
    const coords = getWinningPositions(grid, wins, paytable, gameType);
    const marked = [...coords.entries()].filter(([, v]) => v.some(i => i !== HIGHLIGHT_ONLY_INDEX)).map(([k]) => k).sort();
    expect(marked).toEqual(['0-0', '1-1', '2-0']);
  });
});
