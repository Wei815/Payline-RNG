/**
 * 流程：產生器的「COMBO（連續消除）」與「大獎區間」→ 複製腳本 → 依遊戲規則重播驗證
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../../types';
import { loadFixture, SYNTHETIC_PAY_ANYWHERE, makeConfig, withSeed, type GameFixture } from './harness';
import { runGeneratorSearch } from '../../../hooks/generatorSearch';
import { defaultSpecialSymbolConfig } from '../../../store/useGameStore';
import { getGameIntervals } from '../../../utils/evaluation/GameIntervals';
import { calculateCombinationWin } from '../../../flows/combinationWin';
import { getScriptFormatter, getTraits } from '../../registry';
import { expectKnownIssues } from './knownIssues';
import { SPECIAL_KNOWN } from './knownIssues.data';
import {
  asScript, cascadeToEnd, gridFromMathIds, gridFromScriptLine, parseScript, replayRomaChain, scriptCtx, winCtx, type Violation,
} from './flowRules';

const REPORT = process.env.FLOW_REPORT_SPECIAL;

async function run(fx: GameFixture, symbol: string, seed: number) {
  return withSeed(seed, () => runGeneratorSearch({
    selectedSymbol: symbol, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
    currentPaytable: fx.paytable, gameType: fx.gameType, topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
    specialSymbolConfig: defaultSpecialSymbolConfig, customPaylines: fx.paylines, isFreeGame: false, bet: 1,
    multiplierIntervals: getGameIntervals(fx.gameType), stripSets: fx.stripSets,
  }));
}

const ALL: [GameType, string][] = [
  ['linegame', 'Mermaid'], ['waygame', 'Mermaid'], ['waygame_qin', 'Chin Shi'], ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_roma', 'Roma'], ['linegame_set2', 'The Luxe'], ['linegame_gods', 'God of Wars'],
  ['payanywhere', SYNTHETIC_PAY_ANYWHERE], ['payanywhere_set2', 'Battle of Set'],
];

describe('COMBO / 大獎區間 → 規則重播', () => {
  const violations: Violation[] = [];
  const stats: Record<string, unknown>[] = [];

  for (const [gameType, template] of ALL) {
    test(gameType, async () => {
      const fx = await loadFixture(gameType, template);
      const fmt = getScriptFormatter(gameType);
      const ctx = scriptCtx(fx);
      const traits = getTraits(gameType);
      const push = (comb: string, rule: string, detail: string) => violations.push({ game: gameType, comb, rule, detail });

      // ---- 大獎區間 ----
      const intervals = getGameIntervals(gameType);
      const wm = await run(fx, 'WIN_MULTIPLIER', 11);
      for (const iv of intervals) {
        const c = wm.find(x => x.name === iv.name);
        stats.push({ game: gameType, flow: 'WIN_MULTIPLIER', name: iv.name, found: !!c?.rng });
        if (!c?.rng) { push(iv.name, 'W0 找不到大獎區間組合', ''); continue; }
        const sc = asScript(c) as ReturnType<typeof asScript> & { goldFrames?: Record<string, number>; jackpots?: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> };
        let grid: string[][];
        let strips = fx.strips;
        if (traits.mathIdGenerator) grid = gridFromMathIds(fx, sc.fullMathIds ?? []);
        else {
          const b = gridFromScriptLine(fx, parseScript(fmt.copyAllLine(sc, ctx))[0]);
          grid = b.grid;
          if (b.stripId !== undefined && fx.stripSets?.[b.stripId]) strips = fx.stripSets[b.stripId];
        }
        const config = makeConfig(fx, { goldFrames: sc.goldFrames ?? {}, jackpots: sc.jackpots ?? {} });
        // 羅馬：依腳本「初始 + 遞補」逐行重播（遞補由下一行 RNG 決定），最後一盤須 0 贏分
        let engineModel: number;
        if (gameType === 'linegame_roma') {
          const chain = replayRomaChain(fx, parseScript(fmt.copyAllLine(sc, ctx)));
          engineModel = chain.total;
          if (chain.winsPerStep.length < 2 || chain.winsPerStep[chain.winsPerStep.length - 1] !== 0) {
            push(iv.name, 'W3 羅馬大獎附遞補且遞補後 0 贏分', `每步贏分筆數 ${chain.winsPerStep.join(',')}`);
          }
        } else {
          engineModel = cascadeToEnd(fx, grid, traits.mathIdGenerator ? [] : (c.rng as number[]), strips, config).total;
        }
        const inRange = (v: number) => v >= iv.min && (iv.max === null || v < iv.max);
        if (!inRange(engineModel)) push(iv.name, 'W1 大獎倍率落在區間（遊戲掉落規則）', `${engineModel} 不在 [${iv.min}, ${iv.max ?? '∞'})`);
        const qa = calculateCombinationWin({ ...winCtx(fx, 'WIN_MULTIPLIER'), goldFrames: sc.goldFrames ?? {} }, c).totalWin;
        if (!inRange(qa)) push(iv.name, 'W2 測案 Win= 落在區間', `測案 ${qa}，遊戲規則 ${engineModel}，區間 [${iv.min}, ${iv.max ?? '∞'})`);
      }

      // ---- COMBO（只對有掉落、非 MathID 即時產生的遊戲） ----
      if (!fx.game.hasCascadeFeature?.() || traits.mathIdGenerator) { expectKnownIssues(gameType, violations, SPECIAL_KNOWN); return; }
      const combos = await run(fx, 'COMBO', 12);
      stats.push({ game: gameType, flow: 'COMBO', found: combos.map(c => c.name) });
      if (combos.length === 0) push('COMBO', 'C0 找不到任何連續消除組合', '');
      for (const c of combos) {
        if (!c.rng) continue;
        const lines = parseScript(fmt.copyAllLine(asScript(c), ctx));
        if (gameType === 'linegame_roma') {
          const { winsPerStep } = replayRomaChain(fx, lines);
          const cascades = winsPerStep.slice(0, -1).filter(n => n > 0).length;
          if (cascades !== c.length || winsPerStep[winsPerStep.length - 1] !== 0) {
            push(c.name, 'C1 Combo 數 = 實際連續消除次數', `腳本 ${lines.length} 行，每步贏分筆數 ${winsPerStep.join(',')}`);
          }
        } else {
          const b = gridFromScriptLine(fx, lines[0]);
          const strips = b.stripId !== undefined && fx.stripSets?.[b.stripId] ? fx.stripSets[b.stripId] : fx.strips;
          const { combos: n } = cascadeToEnd(fx, b.grid, lines[0].slice(0, fx.reelCount), strips);
          if (n !== c.length) push(c.name, 'C1 Combo 數 = 實際連續消除次數', `實際 ${n} 次`);
        }
      }
      expectKnownIssues(gameType, violations, SPECIAL_KNOWN);
    }, 900_000);
  }

  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, violations }, null, 1));
  });
});
