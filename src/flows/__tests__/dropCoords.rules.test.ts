/**
 * 掉落時要消除哪些格子
 * - S1 不論是否中獎都會以 999 標記（僅供高亮），掉落時只能消除真正中獎的格子：
 *   曾把沒中獎的 S1 當中獎消除 → 驗證工具憑空多出掉落、秦皇免遊重複掉落到 30 次、消除掉落測試移除沒中獎的 S1
 * - 中獎座標必須用遊戲自己的線：曾退回預設 20 線，羅馬第 6 條線起標錯、消錯格子
 */
import { describe, expect, test } from 'vitest';
import { buildFixture, loadTemplate, makeConfig, mulberry32 } from '../../games/base/__tests__/harness';
import { GameRegistry } from '../../core/GameRegistry';
import { defaultPaylines, getWinningPositions, HIGHLIGHT_ONLY_INDEX } from '../../utils/evaluation';
import { parseQaSteps } from '../rngValidator';

describe('S1 高亮標記不可觸發消除', () => {
  test('calculateNextDropGrid 只消除真正中獎的格子', () => {
    const game = GameRegistry.getGame('waygame');
    const grid = [['A', 'S1', 'K'], ['A', 'Q', 'J'], ['A', 'K', 'Q']];
    const coords = new Map<string, number[]>([
      ['0-0', [0]], ['1-0', [0]], ['2-0', [0]],
      ['0-1', [HIGHLIGHT_ONLY_INDEX]],
    ]);
    const next = game.calculateNextDropGrid(grid, coords, false, () => 'NEW');
    expect(next[0]).toEqual(['NEW', 'S1', 'K']);
    expect(next[1]).toEqual(['NEW', 'Q', 'J']);
  });

  test('驗證工具：只有 S1、沒有中獎的盤面不掉落', async () => {
    const fx = buildFixture('waygame_qin', await loadTemplate('Chin Shi'));
    const rand = mulberry32(7);
    let rng: number[] | null = null;
    for (let t = 0; t < 20000 && !rng; t++) {
      const cand = fx.strips.map(s => Math.floor(rand() * s.length));
      const grid = fx.game.getGridFromRng(cand, fx.strips, fx.rowCounts, fx.reelCount);
      const wins = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false);
      const coords = getWinningPositions(grid, wins, fx.paytable, fx.gameType, undefined, fx.paylines);
      if (wins.length === 0 && [...coords.values()].some(v => v.includes(HIGHLIGHT_ONLY_INDEX))) rng = cand;
    }
    expect(rng).not.toBeNull();

    for (const isFreeGame of [false, true]) {
      const steps = parseQaSteps({
        jsonInput: JSON.stringify({ QA: [{ RNGs: [rng] }] }),
        gameType: fx.gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
        currentStripSets: [], currentFreeStripSets: [], currentPaytable: fx.paytable, customPaylines: fx.paylines,
        isFreeGame, bet: 1, betMultiplier: 1,
      });
      expect(steps[0].drops).toHaveLength(1);
      expect(steps[0].totalWin).toBe(0);
    }
  });
});

describe('驗證工具使用遊戲自己的中獎線', () => {
  test('羅馬：第 6 條線以後的中獎格與遊戲線一致（不可退回預設 20 線）', async () => {
    const fx = buildFixture('linegame_roma', await loadTemplate('Roma'));
    const rand = mulberry32(11);
    let found: { rng: number[]; expected: string[] } | null = null;
    for (let t = 0; t < 50000 && !found; t++) {
      const rng = fx.strips.map(s => Math.floor(rand() * s.length));
      const grid = fx.game.getGridFromRng(rng, fx.strips, fx.rowCounts, fx.reelCount);
      const wins = fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false).filter(w => w.totalWin > 0);
      if (wins.length !== 1 || wins[0].lineIndex === undefined || wins[0].lineIndex < 5) continue;
      const cells = (lines?: number[][]) => [...getWinningPositions(grid, wins, fx.paytable, fx.gameType, undefined, lines).entries()]
        .filter(([, v]) => v.some(i => i !== HIGHLIGHT_ONLY_INDEX)).map(([k]) => k).sort();
      const expected = cells(fx.paylines);
      // 只取「用預設 20 線會標出不同格子」的盤面，才能區分兩種結果
      if (JSON.stringify(expected) === JSON.stringify(cells(defaultPaylines))) continue;
      found = { rng, expected };
    }
    expect(found).not.toBeNull();

    const steps = parseQaSteps({
      jsonInput: JSON.stringify({ QA: [{ RNGs: [found!.rng] }] }),
      gameType: fx.gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
      currentStripSets: [], currentFreeStripSets: [], currentPaytable: fx.paytable, customPaylines: fx.paylines,
      isFreeGame: false, bet: 1, betMultiplier: 1,
    });
    const got = [...steps[0].drops[0].winningCoords.entries()]
      .filter(([, v]) => v.some(i => i !== HIGHLIGHT_ONLY_INDEX)).map(([k]) => k).sort();
    expect(got).toEqual(found!.expected);
  });
});
