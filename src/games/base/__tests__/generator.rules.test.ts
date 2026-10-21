/**
 * 流程：連線測試產生器 →「複製全部腳本」→ QA 貼上重建盤面 → 規則檢查
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../../types';
import { buildFixture, loadTemplate, withSeed, type GameFixture } from './harness';
import { runGeneratorSearch } from '../../../hooks/generatorSearch';
import { calculateCombinationWin } from '../../../flows/combinationWin';
import { defaultSpecialSymbolConfig } from '../../../store/useGameStore';
import { getScriptFormatter, getTraits } from '../../registry';
import { expectKnownIssues } from './knownIssues';
import { GENERATOR_KNOWN } from './knownIssues.data';
import {
  asScript, usesGoldCascade, cascadeOnce, cascadeToEnd, checkRomaRefill, independentTotal, winCtx, checkSingleCombination, gridFromMathIds, gridFromScriptLine, parseScript, scriptCtx, type Violation,
} from './flowRules';

const CASES: [GameType, string][] = [
  ['linegame', 'Mermaid'],
  ['waygame', 'Mermaid'],
  ['waygame_qin', 'Chin Shi'],
  ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_roma', 'Roma'],
  ['linegame_set2', 'The Luxe'],
  ['linegame_gods', 'God of Wars'],
  ['payanywhere', 'Battle of Set'],
  ['payanywhere_set2', 'Battle of Set'],
];

const REPORT = process.env.FLOW_REPORT;


export interface CombStat { game: GameType; symbol: string; name: string; status: 'clean' | 'interfered' | 'none'; violations: string[] }

async function generate(fx: GameFixture, symbol: string, seed: number) {
  return withSeed(seed, () => runGeneratorSearch({
    selectedSymbol: symbol, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips,
    currentPaytable: fx.paytable, gameType: fx.gameType, topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
    specialSymbolConfig: defaultSpecialSymbolConfig, customPaylines: fx.paylines, isFreeGame: false, bet: 1,
    multiplierIntervals: [], stripSets: fx.stripSets,
  }));
}

const payingSymbols = (fx: GameFixture) => fx.paytable
  .filter(p => p.isEnabled !== false && Object.values(p.payouts).some(v => v > 0))
  .map(p => p.symbolId);

describe('產生器 → 複製腳本 → 規則檢查', () => {
  const stats: CombStat[] = [];
  const violations: Violation[] = [];

  for (const [gameType, template] of CASES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const fmt = getScriptFormatter(gameType);
      const ctx = scriptCtx(fx);
      const traits = getTraits(gameType);
      let seed = 1;
      for (const symbol of payingSymbols(fx)) {
        const combs = await generate(fx, symbol, seed++);
        for (const c of combs) {
          const v: string[] = [];
          const push = (rule: string, detail: string) => { v.push(`${rule}: ${detail}`); violations.push({ game: gameType, comb: `${symbol} / ${c.name}`, rule, detail }); };
          if (!c.rng) { stats.push({ game: gameType, symbol, name: c.name, status: 'none', violations: [] }); push('N0 找不到組合（無可行滾輪位置）', ''); continue; }

          const script = fmt.copyAllLine(asScript(c), ctx);
          const lines = parseScript(script);
          let grid: string[][];
          if (traits.mathIdGenerator) {
            const ids = asScript(c).fullMathIds ?? [];
            grid = gridFromMathIds(fx, ids);
            if (lines[0]?.length !== ids.slice(0, 30).length) push('S1 腳本與盤面一致', `腳本 ${lines[0]?.length} 碼 / 盤面 ${ids.length} 碼`);
          } else {
            const built = gridFromScriptLine(fx, lines[0]);
            grid = built.grid;
            const direct = fx.game.getGridFromRng(c.rng as number[], c.stripId !== undefined && fx.stripSets?.[c.stripId] ? fx.stripSets[c.stripId] : fx.strips, fx.rowCounts, fx.reelCount);
            if (JSON.stringify(direct) !== JSON.stringify(grid)) push('S1 腳本與盤面一致', `腳本重建盤面與搜尋結果不同`);
          }

          // 只檢查「單一連線」類組合；決戰賽特2 依個數規則另外檢查
          if (gameType === 'payanywhere_set2') {
            const n = grid.flat().filter(s => s === symbol).length;
            if (symbol !== 'B1/B2' && n !== c.length) push('P1 目標個數', `名稱 ${c.length} 個，盤面 ${n} 個`);
          } else if (!c.isInterfered) {
            let board = grid;
            if (usesGoldCascade(fx, c.wildCount)) {
              const strips = c.stripId !== undefined && fx.stripSets?.[c.stripId] ? fx.stripSets[c.stripId] : fx.strips;
              const { next, initialWins } = cascadeOnce(fx, grid, c.rng as number[], strips);
              if (initialWins.some(w => w.symbolId === symbol && w.payout > 0)) push('G1 初始盤面不得已有目標中獎', symbol);
              board = next;
            }
            for (const f of checkSingleCombination(fx, board, symbol, c.length, c.wildCount, fx.paytable)) push(f.rule, f.detail);
          }

          if (gameType === 'linegame_roma' && lines.length >= 2) {
            const err = checkRomaRefill(fx, grid, lines[1]);
            if (err) push('M1 羅馬遞補 0 消除', err);
          }
          // F1：「複製全部測案」的 Win= 必須等於依遊戲規則獨立重算的總贏分
          const strips = c.stripId !== undefined && fx.stripSets?.[c.stripId] ? fx.stripSets[c.stripId] : fx.strips;
          const formula = calculateCombinationWin(winCtx(fx, symbol), c);
          // 依遊戲類別規則：會從滾輪表掉落的遊戲連續掉落到無消除；遞補由腳本下一行決定（羅馬）或 MathID 遊戲只算本盤
          const cascades = fx.game.hasCascadeFeature() && !(fx.game as { findRefillRng?: unknown }).findRefillRng && !traits.mathIdGenerator;
          const expected = cascades
            ? { total: cascadeToEnd(fx, grid, c.rng as number[], strips).total, steps: ['連續掉落至無消除'] }
            : independentTotal(fx, grid, traits.mathIdGenerator ? [] : (c.rng as number[]), strips, symbol);
          if (Math.abs(formula.totalWin - expected.total) > 1e-6) {
            push('F1 測案贏分 = 規則重算', `${formula.formula} ／ 規則重算 ${expected.total} (${expected.steps.join(' → ')})`);
          }
          if (c.isInterfered) push('N1 只找到有干擾的組合', '');
          stats.push({ game: gameType, symbol, name: c.name, status: c.isInterfered ? 'interfered' : 'clean', violations: v });
        }
      }
      expectKnownIssues(gameType, violations, GENERATOR_KNOWN);
    }, 600_000);
  }

  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, violations }, null, 1));
  });
});
