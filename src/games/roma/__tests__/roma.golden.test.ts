import { describe, expect, test } from 'vitest';
import { defineGoldenSuite, evalSample, fmtGrid, makeConfig, withSeed } from '../../base/__tests__/harness';
import type { RomaGame } from '../RomaGame';

defineGoldenSuite(
  {
    gameType: 'linegame_roma', template: 'Roma', seed: 109, combos: true,
    searchCases: [
      { symbol: 'M1', length: 3, wildCount: 0 },
      { symbol: 'M1', length: 5, wildCount: 0 },
      { symbol: 'M2', length: 4, wildCount: 1 },
      { symbol: 'A', length: 3, wildCount: 0 },
      { symbol: 'WX', length: 3, wildCount: 0 },
      { symbol: 'WX', length: 5, wildCount: 0 },
      { symbol: 'K', length: 3, wildCount: 0, isFreeGame: true },
    ],
  },
  getFx => {
    const roma = () => getFx().game as unknown as RomaGame;

    describe('羅馬競技場禁忌防線 (ARCHITECTURE 第 6.2 / 8 章)', () => {
      test('滾輪表輪替：Combo 0 永遠滾輪表 0、Combo 3 為滾輪表 3、之後 2/1 交替', () => {
        expect(Array.from({ length: 10 }, (_, i) => roma().getStripSetIndex(i))).toEqual([0, 1, 2, 3, 2, 1, 2, 1, 2, 1]);
      });

      test('免費遊戲場數 4→4、5→5、6→10、7+→20', () => {
        expect(Array.from({ length: 9 }, (_, i) => roma().getFreeSpinsByCombo(i))).toEqual([0, 0, 0, 0, 4, 5, 10, 20, 20]);
      });

      test('WX×5 給予 M1 5 連線分數', () => {
        const fx = getFx();
        const grid = [['A', 'WX', 'K'], ['Q', 'WX', 'J'], ['K', 'WX', 'A'], ['J', 'WX', 'Q'], ['A', 'WX', 'K']];
        const wins = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false);
        const m1 = fx.paytable.find(p => p.symbolId === 'M1')!;
        const midLine = wins.find(w => w.matchCount === 5);
        expect(midLine?.payout).toBe(m1.payouts.match5);
        expect(evalSample(fx, grid)).toMatchSnapshot();
      });

      test('WX 前綴 (WX-WX-A-A-A) 依第一個一般符號計 5 連', () => {
        const fx = getFx();
        const grid = [['K', 'WX', 'Q'], ['J', 'WX', 'K'], ['Q', 'A', 'J'], ['K', 'A', 'Q'], ['J', 'A', 'K']];
        const wins = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false);
        const a = fx.paytable.find(p => p.symbolId === 'A')!;
        expect(wins.some(w => w.symbolId === 'A' && w.matchCount === 5 && w.payout === a.payouts.match5)).toBe(true);
        expect(evalSample(fx, grid)).toMatchSnapshot();
      });

      test('禁忌 2：includeZeroPayout 時必須回傳 2 連線', () => {
        const fx = getFx();
        const grid = [['K', 'M1', 'Q'], ['J', 'M1', 'K'], ['Q', 'A', 'J'], ['K', 'J', 'Q'], ['J', 'Q', 'K']];
        const wins = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, true);
        expect(wins.some(w => w.symbolId === 'M1' && w.matchCount === 2)).toBe(true);
      });

      test('B1 少於 3 顆時隨贏分一起消除', () => {
        const fx = getFx();
        const grid = [['M1', 'M1', 'B1'], ['K', 'M1', 'Q'], ['Q', 'M1', 'J'], ['B1', 'A', 'Q'], ['J', 'Q', 'K']];
        const sample = evalSample(fx, grid);
        expect(sample.coords).toContain('0-2');
        expect(sample.coords).toContain('3-0');
        expect(sample).toMatchSnapshot();
      });

      test('覆蓋式遞補 cascadeStep', () => {
        const fx = getFx();
        const grid = [['M2', 'M1', 'A'], ['A', 'WX', 'K'], ['K', 'M1', 'M3'], ['J', 'M1', 'Q'], ['M2', 'M1', 'K']];
        const coords = new Set(['0-1', '1-1', '2-1', '3-1', '4-1']);
        const strips1 = fx.stripSets?.[1] ?? fx.strips;
        expect(fmtGrid(roma().cascadeStep(grid, coords, [0, 1, 2, 3, 4], strips1, fx.rowCounts))).toMatchSnapshot();
      });

      test('雙重安全防線 findSafeReplacementRng：回傳的遞補 RNG 必定 0 贏分', async () => {
        const fx = getFx();
        const strips1 = fx.stripSets?.[1] ?? fx.strips;
        const grid = [['M2', 'M1', 'A'], ['A', 'M1', 'K'], ['K', 'M1', 'M3'], ['J', 'Q', 'Q'], ['M2', 'J', 'K']];
        const config = makeConfig(fx);
        const wins = fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false);
        const rng1 = await withSeed(1, () => roma().findSafeReplacementRng(grid, wins, fx.paytable, strips1, fx.rowCounts, fx.paylines));
        expect(rng1).not.toBeNull();
        expect(rng1!.join(',')).toMatchSnapshot();
      });
    });
  },
);
