/**
 * 流程：決戰賽特2 產生器腳本（30 碼盤面 + 遞補 MathID）→「消除掉落測試」載入 → 掉落
 * T1 載入盤面 = 腳本盤面 / T2 第一盤贏分 = 規則重算 / T3 掉落後盤面所有格子都是可辨識的符號（不得出現 ?xx）
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import { buildFixture, loadTemplate, makeConfig, withSeed } from '../../games/base/__tests__/harness';
import { asScript, gridFromMathIds, paying, type Violation } from '../../games/base/__tests__/flowRules';
import { expectKnownIssues } from '../../games/base/__tests__/knownIssues';
import { TUMBLE_KNOWN } from '../../games/base/__tests__/knownIssues.data';
import { runGeneratorSearch } from '../../hooks/generatorSearch';
import { defaultSpecialSymbolConfig } from '../../store/useGameStore';
import { evaluateTumble, gridSymbols, loadInitialGrid, tumbleOnce, type TumbleEnv } from '../tumble';

const REPORT = process.env.FLOW_REPORT_TUMBLE;

describe('決戰賽特2 腳本 → 消除掉落測試', () => {
  const violations: Violation[] = [];
  test('payanywhere_set2', async () => {
    const gameType = 'payanywhere_set2' as const;
    const fx = buildFixture(gameType, await loadTemplate('Battle of Set'));
    const env: TumbleEnv = { gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentPaytable: fx.paytable, isFreeGame: false };
    for (const symbol of ['M1', 'A']) {
      const combs = await withSeed(41, () => runGeneratorSearch({
        selectedSymbol: symbol, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
        currentPaytable: fx.paytable, gameType, topTrackerOther: [], specialSymbolConfig: defaultSpecialSymbolConfig,
        customPaylines: fx.paylines, isFreeGame: false, bet: 1, multiplierIntervals: [], stripSets: fx.stripSets,
      }));
      for (const c of combs) {
        const sc = asScript(c);
        const ids = [...(sc.fullMathIds ?? []).slice(0, 30), ...((sc.dropMathIds ?? []) as (number | string)[])];
        const state = loadInitialGrid(env, ids.join(','), '', '');
        const tag = `${symbol} / ${c.name.replace('\n', ' ')}`;
        const push = (rule: string, detail: string) => violations.push({ game: gameType, comb: tag, rule, detail });
        if ('error' in state) { push('T1 載入盤面', state.error); continue; }

        const expectedGrid = gridFromMathIds(fx, sc.fullMathIds ?? []);
        if (JSON.stringify(gridSymbols(env, state.currentGridIds)) !== JSON.stringify(expectedGrid)) push('T1 載入盤面 = 腳本盤面', '盤面不同');

        const expected = paying(fx.game.evaluate(expectedGrid, fx.paytable, makeConfig(fx), fx.paylines, false)).reduce((s, w) => s + w.totalWin, 0);
        const got = evaluateTumble(env, state).totalWin;
        if (Math.abs(got - expected) > 1e-6) push('T2 第一盤贏分 = 規則重算', `${got} / ${expected}`);

        const next = tumbleOnce(env, state);
        if (next !== state) {
          const unknown = gridSymbols(env, next.currentGridIds).flat().filter(s => s.startsWith('?'));
          if (unknown.length) push('T3 掉落後符號可辨識', `出現 ${unknown.length} 個無法辨識的格子，例如 ${unknown.slice(0, 3).join(' ')}`);
        }
      }
    }
    expectKnownIssues(gameType, violations, TUMBLE_KNOWN);
  }, 300_000);

  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ violations }, null, 1));
  });
});
