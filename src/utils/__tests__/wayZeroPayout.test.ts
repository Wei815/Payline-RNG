/**
 * Way 遊戲 0 賠率的連線只在 includeZeroPayout 時回傳
 * 曾經 3 連以上一律回傳：秦皇「10」6 連 96 路 0 分被當中獎消除 17 格、RTP 模擬把 0 賠率符號計入命中
 */
import { describe, expect, test } from 'vitest';
import { evaluateGrid } from '../evaluation';
import type { PaytableRule } from '../../types';

const rule = (symbolId: string, m3: number): PaytableRule => ({
  symbolId, name: symbolId, payouts: { match3: m3, match4: m3, match5: m3 }, isWild: false, isScatter: false,
});

describe('Way 0 賠率連線', () => {
  const grid = [['Z', 'A'], ['Z', 'K'], ['Z', 'Q'], ['J', 'A'], ['K', 'J']];
  const paytable = [rule('Z', 0), rule('A', 5)];

  test('一般評估不回傳 0 賠率連線', () => {
    expect(evaluateGrid(grid, paytable, 'waygame', undefined, false).map(w => w.symbolId)).not.toContain('Z');
  });
  test('includeZeroPayout 時回傳（反向搜尋需要）', () => {
    expect(evaluateGrid(grid, paytable, 'waygame', undefined, true).map(w => w.symbolId)).toContain('Z');
  });
});
