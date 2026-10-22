import { describe, expect, test } from 'vitest';
import { isInterferingWin } from '../searchRules';
import type { PaytableRule } from '../../../types';

const paytable: PaytableRule[] = [
  { symbolId: 'B1', name: 'B1', payouts: { match3: 0, match4: 0, match5: 0 }, isWild: false, isScatter: true },
  { symbolId: 'A', name: 'A', payouts: { match3: 5 }, isWild: false, isScatter: false },
];
const win = (symbolId: string, matchCount: number, payout: number) => ({ symbolId, matchCount, payout, ways: 1, totalWin: payout });

describe('isInterferingWin', () => {
  test('有贏分即干擾', () => expect(isInterferingWin(win('A', 3, 5), paytable)).toBe(true));
  test('0 賠率的 Scatter × 3 會觸發特色，算干擾', () => expect(isInterferingWin(win('B1', 3, 0), paytable)).toBe(true));
  test('0 賠率的 Scatter × 2 不算', () => expect(isInterferingWin(win('B1', 2, 0), paytable)).toBe(false));
  test('0 賠率的一般符號不算', () => expect(isInterferingWin(win('A', 2, 0), paytable)).toBe(false));
});
