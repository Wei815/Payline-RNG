/**
 * 流程：產生器複製的腳本 → 貼進「RNG 腳本驗證」→ 驗證工具算出的贏分必須與遊戲規則一致
 * V1 第一步總贏分 = 依遊戲規則（產生器 / 搜尋引擎同一套掉落模型）重算
 * V2 羅馬連鎖腳本：第二行為遞補，遞補後 0 贏分
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../types';
import { buildFixture, loadTemplate, makeConfig, withSeed, type GameFixture } from '../../games/base/__tests__/harness';
import {
  asScript, cascadeToEnd, gridFromMathIds, gridFromScriptLine, parseScript, paying, scriptCtx, type Violation,
} from '../../games/base/__tests__/flowRules';
import { runGeneratorSearch } from '../../hooks/generatorSearch';
import { defaultSpecialSymbolConfig } from '../../store/useGameStore';
import { getScriptFormatter, getTraits } from '../../games/registry';
import { expectKnownIssues } from '../../games/base/__tests__/knownIssues';
import { VALIDATOR_KNOWN } from '../../games/base/__tests__/knownIssues.data';
import { parseQaSteps } from '../rngValidator';

const REPORT = process.env.FLOW_REPORT_VALIDATOR;
const CASES: [GameType, string][] = [
  ['linegame', 'Mermaid'], ['waygame', 'Mermaid'], ['waygame_qin', 'Chin Shi'], ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_roma', 'Roma'], ['linegame_set2', 'The Luxe'], ['linegame_gods', 'God of Wars'], ['payanywhere_set2', 'Battle of Set'],
];

const symbolsFor = (fx: GameFixture) => fx.paytable
  .filter(p => !p.isScatter && !p.isWild && p.isEnabled !== false && Object.values(p.payouts).some(v => v > 0))
  .map(p => p.symbolId).slice(0, 3);

describe('腳本 → RNG 腳本驗證 → 贏分一致', () => {
  const violations: Violation[] = [];
  let checked = 0;

  for (const [gameType, template] of CASES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const fmt = getScriptFormatter(gameType);
      const ctx = scriptCtx(fx);
      const traits = getTraits(gameType);
      const toArr = (sets?: Record<string, string[][]>) => (sets ? Object.keys(sets).sort((a, b) => +a - +b).map(k => sets[k]) : []);

      for (const symbol of symbolsFor(fx)) {
        const combs = await withSeed(21, () => runGeneratorSearch({
          selectedSymbol: symbol, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
          currentPaytable: fx.paytable, gameType, topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
          specialSymbolConfig: defaultSpecialSymbolConfig, customPaylines: fx.paylines, isFreeGame: false, bet: 1,
          multiplierIntervals: [], stripSets: fx.stripSets,
        }));
        for (const c of combs.filter(x => x.rng && !x.isInterfered)) {
          const sc = asScript(c);
          const script = fmt.copyAllLine(sc, ctx);
          const lines = parseScript(script);
          const classIds = sc.classStr ? [parseScript(sc.classStr)[0]] : [];
          const steps = parseQaSteps({
            jsonInput: JSON.stringify({ QA: [{ RNGs: lines, ClassIDs: classIds }] }),
            gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
            currentStripSets: toArr(fx.stripSets), currentFreeStripSets: toArr(fx.freeStripSets), currentPaytable: fx.paytable,
            customPaylines: fx.paylines, isFreeGame: false, bet: 1, betMultiplier: 1,
          });
          checked++;
          const tag = `${symbol} / ${c.name}`;
          const push = (rule: string, detail: string) => violations.push({ game: gameType, comb: tag, rule, detail });

          // 依遊戲規則重算第一步
          let expected: number;
          if (traits.mathIdGenerator) {
            const grid = gridFromMathIds(fx, sc.fullMathIds ?? []);
            expected = paying(fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false)).reduce((s, w) => s + w.totalWin, 0);
          } else if (gameType === 'linegame_roma') {
            const grid = gridFromScriptLine(fx, lines[0]).grid;
            expected = paying(fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, false)).reduce((s, w) => s + w.totalWin, 0);
          } else {
            const b = gridFromScriptLine(fx, lines[0]);
            const strips = b.stripId !== undefined && fx.stripSets?.[b.stripId] ? fx.stripSets[b.stripId] : fx.strips;
            expected = cascadeToEnd(fx, b.grid, lines[0].slice(0, fx.reelCount), strips).total;
          }
          if (Math.abs(steps[0].totalWin - expected) > 1e-6) {
            push('V1 驗證工具贏分 = 規則重算', `驗證工具 ${steps[0].totalWin}（${steps[0].drops.length} 次盤面），規則 ${expected}`);
          }
          if (gameType === 'linegame_roma' && lines.length >= 2 && steps[0].drops.length > 1) {
            push('V2 羅馬遞補應使用腳本下一行', `驗證工具自行模擬掉落 ${steps[0].drops.length - 1} 次，未使用腳本第 2 行遞補 RNG`);
          }
        }
      }
      expectKnownIssues(gameType, violations, VALIDATOR_KNOWN);
    }, 900_000);
  }

  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ checked, violations }, null, 1));
  });
});
