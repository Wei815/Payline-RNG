/**
 * 反向搜尋效能 / 是否最優的評估（預設跳過；FLOW_BENCH=1 才執行，輸出 JSON 到 FLOW_BENCH_OUT）
 *
 * 對每個「遊戲 × 符號 × 連線數 × 百搭數」：
 * 1. 以 3 個種子呼叫目前的搜尋引擎，用獨立規則檢查（零干擾、ways=1、百搭數）判定是否真的找到乾淨解，記錄耗時
 * 2. 引擎 3 次都失敗時，用「依規則先篩選每軸停點」的建構式 oracle（最多 ORACLE_BUDGET 次）證明解是否存在
 *    → 存在 = 引擎漏解（false negative）
 */
import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import type { GameType } from '../../types';
import { buildFixture, loadTemplate, mulberry32, withSeed, type GameFixture } from '../../games/base/__tests__/harness';
import { cascadeOnce, checkSingleCombination, usesGoldCascade, WILDS } from '../../games/base/__tests__/flowRules';
import { getTraits } from '../../games/registry';

const RUN = !!process.env.FLOW_BENCH;
const OUT = process.env.FLOW_BENCH_OUT;
const ORACLE_BUDGET = Number(process.env.FLOW_ORACLE_BUDGET ?? 60000);
const ONLY = process.env.FLOW_BENCH_GAMES?.split(',');
const GAMES_ALL: [GameType, string][] = [
  ['linegame', 'Mermaid'], ['waygame', 'Mermaid'], ['waygame_qin', 'Chin Shi'], ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_roma', 'Roma'], ['payanywhere', 'Battle of Set'],
];
const GAMES = GAMES_ALL.filter(([g]) => !ONLY || ONLY.includes(g));

interface Row {
  game: GameType; symbol: string; length: number; wild: number;
  engineClean: number; engineInterfered: number; engineNone: number; engineMs: number;
  oracle?: 'found' | 'not-found' | 'skipped'; oracleTries?: number; oracleMs?: number;
}

const isClean = (fx: GameFixture, grid: string[][], symbol: string, length: number, wild: number) =>
  checkSingleCombination(fx, grid, symbol, length, wild, fx.paytable).length === 0;

/** 依規則篩選停點的建構式取樣 */
function oracle(fx: GameFixture, symbol: string, length: number, wild: number): { found: boolean; tries: number } {
  const fam = getTraits(fx.gameType).family;
  const rand = mulberry32(length * 131 + wild * 17 + symbol.charCodeAt(0));
  const strips = fx.strips;
  const isT = (s: string) => s === symbol;
  const isW = (s: string) => WILDS.has(s);
  const win = (c: number, i: number) => Array.from({ length: fx.rowCounts[c] || 3 }, (_, r) => strips[c][(i + r) % strips[c].length]);
  const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];
  const all = (c: number) => strips[c].map((_, i) => i);

  for (let t = 1; t <= ORACLE_BUDGET; t++) {
    const wildReels = new Set<number>();
    const avail = Array.from({ length }, (_, i) => i);
    for (let k = 0; k < wild && avail.length; k++) wildReels.add(avail.splice(Math.floor(rand() * avail.length), 1)[0]);
    const rng: number[] = [];
    let ok = true;
    if (fam === 'line') {
      const line = pick(fx.paylines);
      for (let c = 0; c < fx.reelCount && ok; c++) {
        const at = (i: number) => strips[c][(i + line[c]) % strips[c].length];
        const cands = c < length ? all(c).filter(i => (wildReels.has(c) ? isW(at(i)) : isT(at(i))))
          : c === length ? all(c).filter(i => !isT(at(i)) && !isW(at(i))) : all(c);
        if (!cands.length) ok = false; else rng.push(pick(cands));
      }
    } else if (fam === 'way') {
      for (let c = 0; c < fx.reelCount && ok; c++) {
        const cands = c < length
          ? all(c).filter(i => { const w = win(c, i); const n = w.filter(s => isT(s) || isW(s)).length; return n === 1 && (wildReels.has(c) ? w.some(isW) : w.some(isT)); })
          : c === length ? all(c).filter(i => !win(c, i).some(s => isT(s) || isW(s))) : all(c);
        if (!cands.length) ok = false; else rng.push(pick(cands));
      }
    } else {
      // Pay Anywhere：逐軸挑選目標個數，使總數恰為 length
      let remain = length;
      const maxPerReel = Array.from({ length: fx.reelCount }, (_, c) => Math.max(0, ...all(c).map(i => win(c, i).filter(isT).length)));
      for (let c = 0; c < fx.reelCount && ok; c++) {
        const byCount = new Map<number, number[]>();
        for (const i of all(c)) { const n = win(c, i).filter(isT).length; byCount.set(n, [...(byCount.get(n) ?? []), i]); }
        const restMax = maxPerReel.slice(c + 1).reduce((a, b) => a + b, 0);
        const feasible = [...byCount.keys()].filter(n => n <= remain && remain - n <= restMax);
        if (!feasible.length) { ok = false; break; }
        const n = c === fx.reelCount - 1 ? remain : pick(feasible);
        const list = byCount.get(n);
        if (!list) { ok = false; break; }
        rng.push(pick(list));
        remain -= n;
      }
      ok = ok && remain === 0;
    }
    if (!ok) continue;
    const grid = fx.game.getGridFromRng(rng, strips, fx.rowCounts, fx.reelCount);
    if (isClean(fx, grid, symbol, length, wild)) return { found: true, tries: t };
  }
  return { found: false, tries: ORACLE_BUDGET };
}

describe.skipIf(!RUN)('反向搜尋效能與漏解評估', () => {
  const rows: Row[] = [];
  for (const [gameType, template] of GAMES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const traits = getTraits(gameType);
      const symbols = fx.paytable.filter(p => !p.isScatter && !p.isWild && p.isEnabled !== false && Object.values(p.payouts).some(v => v > 0)).map(p => p.symbolId);
      // Pay Anywhere：產生器依賠率表推算個數（此範本 match3~5 → 3~6 個），與 UI 實際送出的長度一致
      const lengths = traits.family === 'payanywhere' ? [3, 4, 5, 6] : Array.from({ length: fx.reelCount - 2 }, (_, i) => i + 3);
      for (const symbol of symbols) {
        for (const length of lengths) {
          for (const wild of traits.family === 'payanywhere' ? [0] : [0, 1]) {
            const row: Row = { game: gameType, symbol, length, wild, engineClean: 0, engineInterfered: 0, engineNone: 0, engineMs: 0 };
            for (const seed of [1, 2, 3]) {
              const t0 = Date.now();
              const res = await withSeed(seed, () => fx.game.findRngForCombination(
                symbol, length, wild, fx.strips, fx.rowCounts, fx.paytable, fx.reelCount, gameType, ['WX', 'WX', 'WX', 'WX'],
                fx.paylines, false, fx.stripSets, !!traits.goldCascadeSearch && wild > 0,
              ));
              row.engineMs += Date.now() - t0;
              if (!res.rng) { row.engineNone++; continue; }
              const strips = res.stripId !== undefined && fx.stripSets?.[res.stripId] ? fx.stripSets[res.stripId] : fx.strips;
              let grid = fx.game.getGridFromRng(res.rng, strips, fx.rowCounts, fx.reelCount);
              if (usesGoldCascade(fx, wild)) grid = cascadeOnce(fx, grid, res.rng, strips).next;
              if (isClean(fx, grid, symbol, length, wild)) row.engineClean++; else row.engineInterfered++;
            }
            row.engineMs = Math.round(row.engineMs / 3);
            if (row.engineClean === 0) {
              const t0 = Date.now();
              const o = oracle(fx, symbol, length, wild);
              row.oracle = o.found ? 'found' : 'not-found';
              row.oracleTries = o.tries;
              row.oracleMs = Date.now() - t0;
            }
            rows.push(row);
          }
        }
      }
      expect(rows.length).toBeGreaterThan(0);
    }, 3_600_000);
  }
  test('輸出', () => { if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 1)); });
});
