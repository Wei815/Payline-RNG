/**
 * 黃金樣本 (Golden Snapshot) 回歸測試共用工具
 *
 * 目的：每款遊戲以「目前程式碼」的輸出為基準存成快照，
 * 之後任何重構或開發新遊戲，只要 `npm test` 快照有變動就代表舊遊戲行為被改到了。
 *
 * - 所有隨機來源 (Math.random) 皆以固定種子取代，搜尋引擎結果可完全重現。
 * - 範本資料走與 App 相同的 parseExcelData() 解析路徑。
 */
import * as fs from 'fs';
import * as path from 'path';
import { vi, describe, test, expect, beforeAll } from 'vitest';
import type { GameConfig, GameType, PaytableRule } from '../../../types';
import type { WinResult } from '../../../utils/evaluation';
import { defaultPaylines, getWinningPositions } from '../../../utils/evaluation';
import { parseExcelData, type ExcelParsedData } from '../../../utils/excelParser';
import { GameRegistry } from '../../../core/GameRegistry';
import type { AbstractGame } from '../AbstractGame';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates');

// ==========================================
// 可重現隨機數
// ==========================================

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 以固定種子取代 Math.random 執行 fn（含 async） */
export async function withSeed<T>(seed: number, fn: () => T | Promise<T>): Promise<T> {
  const spy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
}

// ==========================================
// 遊戲測試環境 (Fixture)
// ==========================================

export interface GameFixture {
  gameType: GameType;
  game: AbstractGame;
  paytable: PaytableRule[];
  strips: string[][];
  freeStrips?: string[][];
  stripSets?: Record<string, string[][]>;
  freeStripSets?: Record<string, string[][]>;
  rowCounts: number[];
  reelCount: number;
  paylines: number[][];
}

export async function loadTemplate(fileFragment: string): Promise<ExcelParsedData> {
  const fileName = fs.readdirSync(TEMPLATES_DIR).find(f => f.includes(fileFragment) && f.endsWith('.xlsx') && !f.startsWith('~$'));
  if (!fileName) throw new Error(`找不到範本：${fileFragment}`);
  const buf = fs.readFileSync(path.join(TEMPLATES_DIR, fileName));
  return parseExcelData(new File([buf], fileName));
}

function toRecord(sets?: string[][][]): Record<string, string[][]> | undefined {
  // 與 SlotConsole.formattedStripSets 相同：只有一組時不傳 stripSets
  if (!sets || sets.length <= 1) return undefined;
  const rec: Record<string, string[][]> = {};
  sets.forEach((s, i) => { rec[i] = s; });
  return rec;
}

/** 由範本 (或遊戲預設資料) 建立測試環境 */
export function buildFixture(gameType: GameType, parsed?: ExcelParsedData): GameFixture {
  const game = GameRegistry.getGame(gameType) as AbstractGame;
  const strips = parsed?.strips ?? game.getDefaultReelStrips();
  const reelCount = parsed?.reelCount ?? strips.length;
  const defaultLines = game.getDefaultConfig().paylines;
  return {
    gameType,
    game,
    paytable: parsed?.paytable ?? game.getDefaultPaytable(),
    strips,
    freeStrips: parsed?.freeStrips,
    stripSets: toRecord(parsed?.stripSets),
    freeStripSets: toRecord(parsed?.freeStripSets),
    rowCounts: parsed?.rowCounts ?? Array(reelCount).fill(3),
    reelCount,
    paylines: parsed?.paylines ?? (defaultLines && defaultLines.length > 0 ? defaultLines : defaultPaylines),
  };
}

export function makeConfig(fx: GameFixture, overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gameType: fx.gameType,
    paylines: fx.paylines,
    effectiveBet: 1,
    specialRules: { derivativeSymbols: { B1: ['B2'] } },
    ...overrides,
  };
}

// ==========================================
// 快照序列化（精簡成一行字串，方便 diff 閱讀）
// ==========================================

export const fmtGrid = (grid: string[][]) => grid.map(col => col.join(',')).join(' | ');

export const fmtWins = (wins: WinResult[]) =>
  wins.map(w => {
    const parts = [`${w.symbolId}x${w.matchCount}`, `ways=${w.ways}`, `pay=${w.payout}`, `total=${w.totalWin}`];
    if (w.lineIndex !== undefined) parts.push(`line=${w.lineIndex}`);
    if (w.multiplier !== undefined) parts.push(`mult=${w.multiplier}`);
    if (w.isJackpot) parts.push('JP');
    return parts.join(' ');
  });

export const fmtCoords = (m: Map<string, number[]>) =>
  [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v.join('/')}`).join(' ');

// ==========================================
// 盤面產生器
// ==========================================

export function symbolAlphabet(fx: GameFixture, extra: string[] = []): string[] {
  const set = new Set<string>();
  const allStrips = [fx.strips, fx.freeStrips, ...Object.values(fx.stripSets ?? {}), ...Object.values(fx.freeStripSets ?? {})];
  for (const s of allStrips) s?.forEach(col => col.forEach(sym => set.add(sym)));
  fx.paytable.forEach(p => set.add(p.symbolId));
  extra.forEach(e => set.add(e));
  return [...set].sort();
}

/** 由滾輪表 + RNG 取得盤面的樣本 */
export function rngGrids(fx: GameFixture, strips: string[][], count: number, rand: () => number) {
  const out: { rng: number[]; grid: string[][] }[] = [];
  for (let i = 0; i < count; i++) {
    const rng = strips.map(col => Math.floor(rand() * Math.max(col.length, 1)));
    out.push({ rng, grid: fx.game.getGridFromRng(rng, strips, fx.rowCounts, fx.reelCount) });
  }
  return out;
}

/** 偏向中獎的隨機盤面：每盤挑一個目標符號高機率出現，並混入百搭與特殊符號 */
export function biasedGrids(fx: GameFixture, alphabet: string[], count: number, rand: () => number, wild = 'WX') {
  const targets = fx.paytable.filter(p => !p.isWild).map(p => p.symbolId);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const out: string[][][] = [];
  for (let i = 0; i < count; i++) {
    const target = pick(targets.length > 0 ? targets : alphabet);
    const grid = Array.from({ length: fx.reelCount }, (_, c) =>
      Array.from({ length: fx.rowCounts[c] || 3 }, () => {
        const r = rand();
        if (r < 0.45) return target;
        if (r < 0.55) return wild;
        return pick(alphabet);
      }),
    );
    out.push(grid);
  }
  return out;
}

// ==========================================
// 黃金樣本：盤面評估 / 中獎座標 / 掉落
// ==========================================

export interface EvalSampleOptions {
  config?: Partial<GameConfig>;
  isFreeGame?: boolean;
}

export function evalSample(fx: GameFixture, grid: string[][], opts: EvalSampleOptions = {}) {
  const config = makeConfig(fx, opts.config);
  const wins = fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false);
  const winsZero = fx.game.evaluate(grid, fx.paytable, config, fx.paylines, true);
  const coords = getWinningPositions(grid, wins, fx.paytable, fx.gameType, undefined, fx.paylines);
  const sample: Record<string, unknown> = {
    grid: fmtGrid(grid),
    wins: fmtWins(wins),
    winsZero: fmtWins(winsZero),
    coords: fmtCoords(coords),
  };
  if (fx.game.hasCascadeFeature() && wins.length > 0) {
    const isFree = opts.isFreeGame ?? false;
    const next = fx.game.calculateNextDropGrid(grid, coords, isFree, (c, i, n) => `~${c}.${i}/${n}`);
    sample.nextDrop = fmtGrid(next);
  }
  return sample;
}

/** 每款遊戲都適用的標準黃金樣本集合 */
export function standardGolden(fx: GameFixture, seed: number, opts: { extraSymbols?: string[]; config?: Partial<GameConfig>; wild?: string } = {}) {
  const rand = mulberry32(seed);
  const alphabet = symbolAlphabet(fx, opts.extraSymbols);
  const result: Record<string, unknown> = {};

  const stripSources: [string, string[][] | undefined][] = [
    ['base', fx.strips],
    ['free', fx.freeStrips],
    ...Object.entries(fx.stripSets ?? {}).map(([k, v]) => [`baseSet${k}`, v] as [string, string[][]]),
    ...Object.entries(fx.freeStripSets ?? {}).map(([k, v]) => [`freeSet${k}`, v] as [string, string[][]]),
  ];
  for (const [label, strips] of stripSources) {
    if (!strips || strips.length === 0 || strips.every(s => s.length === 0)) continue;
    result[`rng:${label}`] = rngGrids(fx, strips, 15, rand).map(({ rng, grid }) => ({
      rng: rng.join(','),
      ...evalSample(fx, grid, { config: opts.config, isFreeGame: label.startsWith('free') }),
    }));
  }

  result.biased = biasedGrids(fx, alphabet, 40, rand, opts.wild).map(grid => evalSample(fx, grid, { config: opts.config }));

  result.tumbleMultiplier = {
    base: [0, 1, 2, 3, 4, 5].map(n => fx.game.getTumbleMultiplier(n, false)),
    free: [0, 1, 2, 3, 4, 5].map(n => fx.game.getTumbleMultiplier(n, true)),
  };
  result.traits = {
    hasCascade: fx.game.hasCascadeFeature(),
    positionDependent: fx.game.isPositionDependent(),
    maxRandomAttempts: fx.game.getMaxRandomAttempts(),
    unremovable: alphabet.filter(s => fx.game.isSymbolUnremovable(s, false)),
    unremovableFree: alphabet.filter(s => fx.game.isSymbolUnremovable(s, true)),
  };
  return result;
}

// ==========================================
// 黃金樣本：RNG 反向搜尋
// ==========================================

export function searchTargets(fx: GameFixture, max = 3): string[] {
  return fx.paytable
    .filter(p => !p.isWild && !p.isScatter && p.isEnabled !== false && Object.values(p.payouts).some(v => v > 0))
    .map(p => p.symbolId)
    .slice(0, max);
}

export async function searchGolden(
  fx: GameFixture,
  seed: number,
  cases: { symbol: string; length: number; wildCount: number; isFreeGame?: boolean; requireGoldCascade?: boolean }[],
) {
  const out: Record<string, unknown>[] = [];
  for (const [i, cs] of cases.entries()) {
    const isFree = cs.isFreeGame ?? false;
    const strips = isFree && fx.freeStrips ? fx.freeStrips : fx.strips;
    const sets = isFree ? fx.freeStripSets : fx.stripSets;
    const res = await withSeed(seed + i, () =>
      fx.game.findRngForCombination(
        cs.symbol, cs.length, cs.wildCount, strips, fx.rowCounts, fx.paytable, fx.reelCount,
        fx.gameType, undefined, fx.paylines, isFree, sets, cs.requireGoldCascade ?? false,
      ),
    );
    const r = res as typeof res & { allRngs?: number[][] };
    const entry: Record<string, unknown> = {
      case: `${cs.symbol}*${cs.length}${cs.wildCount ? `+${cs.wildCount}W` : ''}${isFree ? ' FG' : ''}`,
      rng: r.rng ? r.rng.join(',') : null,
      isInterfered: r.isInterfered,
    };
    if (r.stripId !== undefined) entry.stripId = r.stripId;
    if (r.hasS1Drop !== undefined) entry.hasS1Drop = r.hasS1Drop;
    if (r.allRngs) entry.allRngs = r.allRngs.map(a => a.join(','));
    if (r.rng) {
      const useStrips = r.stripId !== undefined && sets?.[r.stripId] ? sets[r.stripId] : (sets?.[0] ?? strips);
      const grid = fx.game.getGridFromRng(r.rng, useStrips, fx.rowCounts, fx.reelCount);
      entry.grid = fmtGrid(grid);
      entry.wins = fmtWins(fx.game.evaluate(grid, fx.paytable, makeConfig(fx), fx.paylines, true));
    }
    out.push(entry);
  }
  return out;
}

export async function combosGolden(fx: GameFixture, seed: number, isFreeGame = false) {
  const strips = isFreeGame && fx.freeStrips ? fx.freeStrips : fx.strips;
  const sets = isFreeGame ? fx.freeStripSets : fx.stripSets;
  const res = await withSeed(seed, () =>
    fx.game.findRngForCombos(strips, fx.rowCounts, fx.paytable, fx.reelCount, fx.gameType, undefined, fx.paylines, isFreeGame, sets),
  );
  return res.map(r => (r ? r.join(',') : null));
}

// ==========================================
// 標準黃金測試套件
// ==========================================

export interface GoldenSuiteOptions {
  gameType: GameType;
  /** templates/ 內範本檔名片段；省略則使用遊戲預設資料 */
  template?: string;
  seed: number;
  extraSymbols?: string[];
  config?: Partial<GameConfig>;
  wild?: string;
  /** 反向搜尋案例；省略則自動取前 3 個有賠率的符號，測 3 連與滿連 */
  searchCases?: { symbol: string; length: number; wildCount: number; isFreeGame?: boolean; requireGoldCascade?: boolean }[];
  /** 是否測 findRngForCombos */
  combos?: boolean;
}

export function defineGoldenSuite(opts: GoldenSuiteOptions, extra?: (getFx: () => GameFixture) => void) {
  describe(`${opts.gameType} 黃金樣本`, () => {
    let fx: GameFixture;
    beforeAll(async () => {
      fx = buildFixture(opts.gameType, opts.template ? await loadTemplate(opts.template) : undefined);
    });

    test('盤面評估 / 中獎座標 / 掉落', () => {
      expect(standardGolden(fx, opts.seed, opts)).toMatchSnapshot();
    });

    test('RNG 反向搜尋', async () => {
      const cases = opts.searchCases ?? searchTargets(fx).flatMap(symbol => [
        { symbol, length: 3, wildCount: 0 },
        { symbol, length: fx.reelCount, wildCount: 0 },
        { symbol, length: 3, wildCount: 1 },
      ]);
      expect(await searchGolden(fx, opts.seed, cases)).toMatchSnapshot();
    });

    if (opts.combos) {
      test('Combo 搜尋', async () => {
        expect(await combosGolden(fx, opts.seed)).toMatchSnapshot();
      });
    }

    extra?.(() => fx);
  });
}
