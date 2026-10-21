/**
 * 流程：贏分線路一覽 → 每條線的 RNG → 依規則重建盤面驗證
 * L1 該線有目標符號滿線贏分 / L2 其他線零干擾 / L3 羅馬附帶遞補 RNG 且遞補後 0 贏分 / L4 MathID 遊戲盤面同樣規則
 * 另以隨機取樣 oracle 檢查「顯示有干擾 / 找不到」的線是否其實存在零干擾解（搜尋是否最優）
 */
import { describe, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../types';
import { buildFixture, loadTemplate, mulberry32, withSeed, makeConfig, type GameFixture } from '../../games/base/__tests__/harness';
import { checkRomaRefill, gridFromMathIds, paying, type Violation } from '../../games/base/__tests__/flowRules';
import { computeLineViewerLines } from '../lineViewer';
import { expectKnownIssues } from '../../games/base/__tests__/knownIssues';
import { LINE_VIEWER_KNOWN } from '../../games/base/__tests__/knownIssues.data';
import { getTraits } from '../../games/registry';

const REPORT = process.env.FLOW_REPORT_LINES;
/** 完整矩陣（全部符號 + oracle 漏解檢查）約 8 分鐘；預設只跑每款前 2 個符號 */
const FULL = !!process.env.FLOW_FULL;
const CASES: [GameType, string][] = [
  ['linegame', 'Mermaid'], ['linegame_roma', 'Roma'], ['linegame_set2', 'The Luxe'], ['linegame_gods', 'God of Wars'],
];

const lineSymbols = (fx: GameFixture) => fx.paytable
  .filter(p => !p.isScatter && !p.isWild && p.isEnabled !== false && (p.payouts.match5 ?? 0) > 0)
  .map(p => p.symbolId);

/** oracle：在同一組候選停點中隨機取樣，找零干擾解 */
function oracleFindsClean(fx: GameFixture, lineIdx: number, symbol: string, useWx: boolean, tries = 20000): boolean {
  const line = fx.paylines[lineIdx];
  const cands = fx.strips.map((strip, c) => strip.map((_, i) => i).filter(i => {
    const s = strip[(i + line[c]) % strip.length];
    return s === symbol || (useWx && (s === 'WX' || s === 'WILD' || s === 'W'));
  }));
  if (cands.some(c => c.length === 0)) return false;
  const rand = mulberry32(lineIdx * 997 + symbol.length);
  const config = makeConfig(fx);
  for (let t = 0; t < tries; t++) {
    const rng = cands.map(c => c[Math.floor(rand() * c.length)]);
    const grid = fx.game.getGridFromRng(rng, fx.strips, fx.rowCounts, fx.reelCount);
    const wins = paying(fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false));
    if (wins.some(w => w.lineIndex === lineIdx) && wins.every(w => w.lineIndex === lineIdx)) return true;
  }
  return false;
}

describe('贏分線路一覽 → 規則檢查', () => {
  const violations: Violation[] = [];
  const stats: Record<string, unknown>[] = [];

  for (const [gameType, template] of CASES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const config = makeConfig(fx);
      const isMathId = getTraits(gameType).mathIdGenerator;
      for (const symbol of lineSymbols(fx).slice(0, FULL ? undefined : 2)) {
        for (const useWx of [false, true]) {
          const results = await withSeed(3, () => computeLineViewerLines({
            gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips, stripSets: fx.stripSets,
            currentPaytable: fx.paytable, customPaylines: fx.paylines, linesToRender: fx.paylines,
            activeLineViewerSymbol: symbol, useWxInLines: useWx, lineViewerPayout: 0,
          }));
          for (const r of results) {
            const tag = `${symbol}${useWx ? '+WX' : ''} L${r.lineIdx + 1}`;
            const push = (rule: string, detail: string) => violations.push({ game: gameType, comb: tag, rule, detail });
            let grid: string[][] | null = null;
            if (isMathId) grid = r.mathIdRng ? gridFromMathIds(fx, r.mathIdRng.join(',').split(',')) : null;
            else if (r.rng) grid = fx.game.getGridFromRng(r.rng, fx.strips, fx.rowCounts, fx.reelCount);
            if (!grid) { stats.push({ game: gameType, tag, status: 'none' }); continue; }

            const wins = paying(fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false));
            const onLine = wins.filter(w => w.lineIndex === r.lineIdx);
            const others = wins.filter(w => w.lineIndex !== r.lineIdx);
            let status = 'clean';
            if (onLine.length === 0) { push('L1 該線有贏分', `該線無贏分；全部 ${wins.map(w => `${w.symbolId}x${w.matchCount}@L${(w.lineIndex ?? -1) + 1}`).join(' ')}`); status = 'bad'; }
            else if (onLine[0].matchCount !== fx.reelCount) push('L1 滿線', `${onLine[0].symbolId}x${onLine[0].matchCount}`);
            if (others.length > 0) {
              status = 'interfered';
              const oracle = FULL && !isMathId && oracleFindsClean(fx, r.lineIdx, symbol, useWx);
              push('L2 零干擾', `${others.map(w => `${w.symbolId}x${w.matchCount}@L${(w.lineIndex ?? -1) + 1}`).join(' ')}${oracle ? '（oracle 找得到零干擾解 → 搜尋漏解）' : ''}`);
              stats.push({ game: gameType, tag, status, oracleClean: oracle });
              continue;
            }
            if (gameType === 'linegame_roma' && onLine.length > 0) {
              if (!r.allRngs || r.allRngs.length < 2) push('L3 羅馬附遞補 RNG', '缺少遞補 RNG');
              else { const e = checkRomaRefill(fx, grid, r.allRngs[1]); if (e) push('L3 羅馬遞補 0 消除', e); }
            }
            stats.push({ game: gameType, tag, status });
          }
        }
      }
      expectKnownIssues(gameType, violations, LINE_VIEWER_KNOWN);
    }, 900_000);
  }

  test('輸出報告', () => {
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, violations }, null, 1));
  });
});
