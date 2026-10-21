/**
 * 流程：產生器腳本存成測試腳本 (Snippet) → 測試腳本庫「載入」→ 自訂盤面必須與腳本盤面一致
 * S1 載入後盤面 = 以腳本重建的盤面（含 Way 遊戲的 Strip ID）
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../types';
import { buildFixture, loadTemplate, withSeed, type GameFixture } from '../../games/base/__tests__/harness';
import { asScript, gridFromMathIds, gridFromScriptLine, parseScript, scriptCtx, type Violation } from '../../games/base/__tests__/flowRules';
import { runGeneratorSearch } from '../../hooks/generatorSearch';
import { defaultSpecialSymbolConfig, useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';
import { expectKnownIssues } from '../../games/base/__tests__/knownIssues';
import { SNIPPET_KNOWN } from '../../games/base/__tests__/knownIssues.data';
import { getScriptFormatter, getTraits } from '../../games/registry';

const REPORT = process.env.FLOW_REPORT_SNIPPET;
const CASES: [GameType, string][] = [
  ['linegame', 'Mermaid'], ['waygame', 'Mermaid'], ['waygame_qin', 'Chin Shi'], ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_roma', 'Roma'], ['linegame_set2', 'The Luxe'], ['linegame_gods', 'God of Wars'], ['payanywhere_set2', 'Battle of Set'],
];
const symbolsFor = (fx: GameFixture) => fx.paytable
  .filter(p => !p.isScatter && !p.isWild && p.isEnabled !== false && Object.values(p.payouts).some(v => v > 0))
  .map(p => p.symbolId).slice(0, 2);

describe('腳本 → 測試腳本庫載入 → 盤面一致', () => {
  const violations: Violation[] = [];
  let checked = 0;
  for (const [gameType, template] of CASES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const fmt = getScriptFormatter(gameType);
      const ctx = scriptCtx(fx);
      useMachineStore.setState({ gameType });
      useGameStore.setState({
        currentPaytable: fx.paytable, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
        currentStripSets: fx.stripSets ? Object.values(fx.stripSets) : [], specialSymbolConfig: defaultSpecialSymbolConfig,
      });
      for (const symbol of symbolsFor(fx)) {
        const combs = await withSeed(31, () => runGeneratorSearch({
          selectedSymbol: symbol, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
          currentPaytable: fx.paytable, gameType, topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
          specialSymbolConfig: defaultSpecialSymbolConfig, customPaylines: fx.paylines, isFreeGame: false, bet: 1,
          multiplierIntervals: [], stripSets: fx.stripSets,
        }));
        for (const c of combs.filter(x => x.rng && !x.isInterfered)) {
          const sc = asScript(c);
          const lines = parseScript(fmt.copyAllLine(sc, ctx));
          const expected = getTraits(gameType).mathIdGenerator ? gridFromMathIds(fx, sc.fullMathIds ?? []) : gridFromScriptLine(fx, lines[0]).grid;
          useGameStore.getState().applySnippet({
            id: 't', title: c.name, gameType, createdAt: 0,
            qaData: { QA: [{ RNGs: lines, ClassIDs: sc.classStr ? [parseScript(sc.classStr)[0]] : [], LuckySelects: [], Selection: [] }] },
          } as never);
          checked++;
          const st = useGameStore.getState();
          // 依滾輪表的遊戲沒有自訂盤面：載入後改為帶入「手動計算盤面」的滾輪位置（與 Strip ID）
          const got = st.activeTab === 'manual'
            ? fx.game.getGridFromRng(st.manualIndices.map(Number), st.currentStrips, fx.rowCounts, fx.reelCount)
            : st.customGridData;
          useGameStore.setState({ currentStrips: fx.strips, activeStripId: 0 });
          // 倍數球在盤面上帶倍數字尾，比較時只看符號本體
          const norm = (g: string[][]) => g.map(col => col.map(s => s.replace(/_\d+X$/, '')));
          if (JSON.stringify(norm(got)) !== JSON.stringify(norm(expected))) {
            violations.push({ game: gameType, comb: `${symbol} / ${c.name}`, rule: 'S1 載入盤面 = 腳本盤面', detail: `載入 ${got.map(c => c.join(',')).join(' | ')} ／ 腳本 ${expected.map(c => c.join(',')).join(' | ')}` });
          }
        }
      }
      expectKnownIssues(gameType, violations, SNIPPET_KNOWN);
    }, 600_000);
  }
  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ checked, violations }, null, 1));
  });
});
