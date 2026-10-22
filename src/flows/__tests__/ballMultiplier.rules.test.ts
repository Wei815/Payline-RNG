/**
 * 決戰賽特2 倍數球規格：盤面所有 F、L 倍數球的值加總，乘在該局全部贏分上（含 B1 / B2）
 * 曾經產生器只加總 F 球、自定義盤面加總 F + L、測案 Win= 完全不乘
 */
import { describe, expect, test } from 'vitest';
import { buildFixture, loadTemplate, makeConfig, withSeed } from '../../games/base/__tests__/harness';
import { runGeneratorSearch } from '../../hooks/generatorSearch';
import { defaultSpecialSymbolConfig } from '../../store/useGameStore';
import { calculateCombinationWin } from '../combinationWin';
import { boardBallMultiplier } from '../ballMultiplier';

describe('決戰賽特2 倍數球 → 測案 Win=', () => {
  test('F + L 加總，乘在全部贏分上', async () => {
    const gameType = 'payanywhere_set2' as const;
    const fx = buildFixture(gameType, await loadTemplate('Battle of Set'));
    const specialSymbolConfig = {
      ...defaultSpecialSymbolConfig,
      multipliersEnabled: true, multiplierCounts: { F1_2X: 1, F3_10X: 1 },
      luckyBallsEnabled: true, luckyCounts: { L1_3X: 1 },
    };
    const combs = await withSeed(5, () => runGeneratorSearch({
      selectedSymbol: 'M1', reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
      currentPaytable: fx.paytable, gameType, topTrackerOther: [], specialSymbolConfig,
      customPaylines: fx.paylines, isFreeGame: false, bet: 1, multiplierIntervals: [], stripSets: fx.stripSets,
    }));

    // 獨立重算：腳本每軸字串 → 符號（MathID 依賠率表，倍數球直接寫成 F1_2X）
    const idToSym = new Map<string, string>();
    for (const p of fx.paytable) for (const id of String(p.mathId ?? '').split(',')) if (id.trim()) idToSym.set(id.trim(), p.symbolId);
    let checked = 0;
    for (const c of combs.filter(x => x.rng)) {
      const grid = (c.rng as unknown as string[]).map(col => col.split(',').map(t => idToSym.get(t) ?? t));
      const balls = grid.flat().filter(s => /^[FL][1-4]_\d+X$/.test(s)).reduce((s, b) => s + parseInt(b.split('_')[1], 10), 0);
      const base = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false).reduce((s, w) => s + w.totalWin, 0);
      const expected = base * Math.max(1, balls);

      const got = calculateCombinationWin({
        gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips, stripSets: fx.stripSets,
        currentPaytable: fx.paytable, customPaylines: fx.paylines, bet: 1, goldFrames: {}, selectedSymbol: 'M1',
        isFreeGame: false, topTrackerOther: [],
      }, c);
      expect(balls).toBe(15);
      expect(boardBallMultiplier(gameType, grid)).toBe(15);
      expect(got.totalWin).toBe(expected);
      if (base > 0) expect(got.formula).toMatch(/\*15=/);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('線遊戲（奢華）的 F/L 逐線加乘，不套用盤面倍數', () => {
    expect(boardBallMultiplier('linegame_set2', [['F1_5X', 'L1_3X']])).toBe(1);
  });
});
