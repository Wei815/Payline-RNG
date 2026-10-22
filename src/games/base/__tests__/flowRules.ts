/**
 * 流程規則檢查器：以「QA 實際貼上腳本」的方式重建盤面，獨立驗證產生器輸出是否符合遊戲規則。
 * 不依賴搜尋引擎內部判斷，避免「引擎自己驗自己」。
 */
import type { GameType, PaytableRule } from '../../../types';
import type { WinResult } from '../../../utils/evaluation';
import { getWinningPositions } from '../../../utils/evaluation';
import { getTraits } from '../../registry';
import type { GeneratorCombination } from '../InstantGenerator';
import type { ScriptCombination, ScriptContext } from '../ScriptFormat';
import type { GameFixture } from './harness';
import { makeConfig } from './harness';
import type { RomaGame } from '../../羅馬競技場 Roma/RomaGame';
import type { CombinationWinContext } from '../../../flows/combinationWin';

export interface Violation {
  game: GameType;
  comb: string;
  rule: string;
  detail: string;
}

export const WILDS = new Set(['WX', 'WILD', 'W']);

export function scriptCtx(fx: GameFixture, isFreeGame = false): ScriptContext {
  return {
    family: getTraits(fx.gameType).family,
    isFreeGame,
    triggerRngSequence: null,
    selectedTriggerCombo: 4,
    combinedClassIdStr: '',
    defaultStripId: 0,
  };
}

/** 解析複製出來的腳本：每個 [...] 一組數字 */
export function parseScript(text: string): number[][] {
  return [...text.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].split(',').map(s => Number(s.trim())));
}

/** 依腳本第一行重建盤面（與 QA 貼到遊戲的結果一致） */
export function gridFromScriptLine(fx: GameFixture, line: number[]): { grid: string[][]; stripId?: number } {
  const fam = getTraits(fx.gameType).family;
  const rng = line.slice(0, fx.reelCount);
  let strips = fx.strips;
  let stripId: number | undefined;
  if (fam === 'way' || fam === 'megaway') {
    stripId = line[Math.min(6, fx.reelCount)];
    if (fx.stripSets && fx.stripSets[stripId]) strips = fx.stripSets[stripId];
  }
  return { grid: fx.game.getGridFromRng(rng, strips, fx.rowCounts, fx.reelCount), stripId };
}

/** MathID 盤面（30 碼）→ 符號盤面 */
export function gridFromMathIds(fx: GameFixture, ids: (number | string)[]): string[][] {
  const map: Record<string, string> = {};
  for (const p of fx.paytable) {
    if (p.mathId === undefined) continue;
    for (const id of String(p.mathId).split(',').map(s => s.trim())) if (!(id in map)) map[id] = p.symbolId;
  }
  const traits = getTraits(fx.gameType);
  let k = 0;
  return Array.from({ length: fx.reelCount }, (_, c) =>
    Array.from({ length: fx.rowCounts[c] || 3 }, () => {
      const id = String(ids[k++]);
      if (traits.ballMathIds && id === '15') return 'F1_2X';
      if (traits.ballMathIds && id === '19') return 'L1_2X';
      return map[id] ?? id;
    }));
}

export const paying = (wins: WinResult[]) => wins.filter(w => w.payout > 0 || w.totalWin > 0);

export function isScatterSym(fx: GameFixture, sym: string) {
  return fx.paytable.some(p => p.symbolId === sym && p.isScatter);
}

/**
 * 單一連線組合的核心規則：
 * R1 恰好一筆目標中獎，連線數 = length（ways = 1）
 * R2 中獎位置上的百搭軸數 = wildCount
 * R3 除目標外沒有任何其他有贏分的中獎（含百搭自己成線）
 */
export function checkSingleCombination(
  fx: GameFixture, grid: string[][], target: string, length: number, wildCount: number, paytable: PaytableRule[],
): { rule: string; detail: string }[] {
  const out: { rule: string; detail: string }[] = [];
  const config = makeConfig(fx);
  const wins = fx.game.evaluate(grid, paytable, config, fx.paylines, true);
  const pays = paying(wins);
  // 同一組格子可能落在多條線上（例如 2 連線共用前兩格），以「中獎格集合」去重後才算筆數
  const cellKey = (w: WinResult) => [...getWinningPositions(grid, [w], paytable, fx.gameType, undefined, fx.paylines).keys()].sort().join('|');
  const distinct = (ws: WinResult[]) => [...new Map(ws.map(w => [cellKey(w), w])).values()];
  const targetWins = distinct(wins.filter(w => w.symbolId === target && w.matchCount === length));
  const payingTargets = distinct(pays.filter(w => w.symbolId === target));

  if (targetWins.length !== 1) {
    out.push({ rule: 'R1 恰好一筆目標連線', detail: `目標 ${target}*${length} 有 ${targetWins.length} 組格子；全部: ${wins.map(w => `${w.symbolId}x${w.matchCount}`).join(' ')}` });
    return out;
  }
  const tw = targetWins[0];
  if (tw.ways !== 1) out.push({ rule: 'R1 ways = 1', detail: `ways=${tw.ways}` });
  if (payingTargets.length > 1) out.push({ rule: 'R1 目標只中一次', detail: `${payingTargets.length} 組有贏分的目標中獎` });

  const coords = getWinningPositions(grid, [tw], paytable, fx.gameType, undefined, fx.paylines);
  const wildReels = new Set<number>();
  for (const key of coords.keys()) {
    const [c, r] = key.split('-').map(Number);
    if (WILDS.has(grid[c][r]) || paytable.some(p => p.isWild && p.symbolId === grid[c][r])) wildReels.add(c);
  }
  if (!isScatterSym(fx, target) && wildReels.size !== wildCount) {
    out.push({ rule: 'R2 百搭數量', detail: `預期 ${wildCount}，實際 ${wildReels.size}` });
  }

  const twKey = cellKey(tw);
  const others = pays.filter(w => !(w.symbolId === target && cellKey(w) === twKey));
  if (others.length > 0) {
    out.push({ rule: 'R3 零干擾', detail: others.map(w => `${w.symbolId}x${w.matchCount}${w.lineIndex !== undefined ? `@L${w.lineIndex}` : ''}=${w.totalWin}`).join(' ') });
  }
  return out;
}

/** 羅馬：遞補 RNG 必須讓遞補後盤面 0 贏分（雙重安全防線） */
export function checkRomaRefill(fx: GameFixture, grid: string[][], refill: number[]): string | null {
  const roma = fx.game as unknown as RomaGame;
  const config = makeConfig(fx);
  const wins = paying(fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false));
  const coordsMap = getWinningPositions(grid, wins, fx.paytable, fx.gameType, undefined, fx.paylines);
  const coords = new Set(coordsMap.keys());
  const strips1 = fx.stripSets?.[1] ?? fx.strips;
  const next = roma.cascadeStep(grid, coords, refill, strips1, fx.rowCounts);
  const nextWins = paying(fx.game.evaluate(next, fx.paytable, config, fx.paylines, false));
  return nextWins.length > 0 ? `遞補後仍有贏分: ${nextWins.map(w => `${w.symbolId}x${w.matchCount}`).join(' ')}` : null;
}

export const asScript = (c: GeneratorCombination) => c as unknown as ScriptCombination;

/**
 * 金框掉落型（皇家金象 / 秦皇的「+WX」）：初始盤面由金框中獎消除、金框轉 WX，
 * 掉落後才形成目標連線。依遊戲自身 applyCascade 模擬一次掉落，回傳掉落後盤面。
 */
export function cascadeOnce(fx: GameFixture, grid: string[][], rng: number[], strips: string[][]): { next: string[][]; initialWins: WinResult[] } {
  const config = makeConfig(fx);
  const initialWins = fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false);
  const coords = getWinningPositions(grid, initialWins, fx.paytable, fx.gameType, undefined, fx.paylines);
  const next = grid.map(col => [...col]);
  const draw = rng.map(i => i - 1);
  const game = fx.game as unknown as { applyCascade: (g: string[][], c: number, rows: number[], strip: string[], d: number[], f: boolean, t: GameType) => void };
  for (let c = 0; c < fx.reelCount; c++) {
    const rows: number[] = [];
    for (let r = 0; r < (fx.rowCounts[c] || 3); r++) {
      if (coords.get(`${c}-${r}`)?.some(i => i !== 999)) rows.push(r);
    }
    if (rows.length) game.applyCascade(next, c, rows, strips[c], draw, false, fx.gameType);
  }
  return { next, initialWins };
}

/**
 * 獨立重算一組 RNG 的總贏分（測案 Win= 應等於此值）：
 * - 非 Way 家族：單盤評估
 * - Way 家族：依遊戲自身 applyCascade（搜尋引擎驗證時用的同一套）連續掉落，
 *   倍數用 game.getTumbleMultiplier，不可消除符號用 game.isSymbolUnremovable，
 *   盤面出現有贏分的目標符號即停止（與測案「出現目標即停」語意一致）
 */
export function independentTotal(fx: GameFixture, grid: string[][], rng: number[], strips: string[][], target: string, isFG = false): { total: number; steps: string[] } {
  const config = makeConfig(fx, getTraits(fx.gameType).wyReels
    ? { wyConfigs: Object.fromEntries(Array.from({ length: fx.reelCount }, (_, c) => [c, { a: 2, b: 10, z: 0 as const }])) }
    : {});
  const fam = getTraits(fx.gameType).family;
  if (fam !== 'way' && fam !== 'megaway') {
    const w = paying(fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false));
    // 倍數球規格（multiplierBalls）：盤面所有 F、L 球的值加總，乘在全部贏分上
    const balls = getTraits(fx.gameType).multiplierBalls
      ? grid.flat().filter(s => /^[FL][1-4]_\d+X$/.test(s)).reduce((s, b) => s + parseInt(b.split('_')[1], 10), 0)
      : 0;
    const base = w.reduce((s, x) => s + x.totalWin, 0);
    return { total: base * Math.max(1, balls), steps: [w.map(x => `${x.symbolId}*${x.matchCount}=${x.totalWin}`).join('+') + (balls > 1 ? `*${balls}` : '')] };
  }
  const game = fx.game as unknown as {
    applyCascade: (g: string[][], c: number, rows: number[], strip: string[], d: number[], f: boolean, t: GameType) => void;
  };
  let board = grid.map(c => [...c]);
  const draw = rng.map(i => i - 1);
  let total = 0;
  const steps: string[] = [];
  for (let n = 0; n < 20; n++) {
    const wins = paying(fx.game.evaluate(board, fx.paytable, config, fx.paylines, false));
    if (wins.length === 0) break;
    const mult = fx.game.getTumbleMultiplier(n, isFG);
    total += wins.reduce((s, w) => s + w.totalWin * mult, 0);
    steps.push(wins.map(w => `${w.symbolId}*${w.matchCount}(x${mult})`).join('+'));
    if (wins.some(w => w.symbolId === target)) break;
    const coords = getWinningPositions(board, wins, fx.paytable, fx.gameType, undefined, fx.paylines);
    const next = board.map(c => [...c]);
    for (let c = 0; c < fx.reelCount; c++) {
      const rows: number[] = [];
      for (let r = 0; r < (fx.rowCounts[c] || 3); r++) {
        if (coords.get(`${c}-${r}`)?.some(i => i !== 999) && !fx.game.isSymbolUnremovable?.(board[c][r], isFG)) rows.push(r);
      }
      if (rows.length) game.applyCascade(next, c, rows, strips[c], draw, isFG, fx.gameType);
    }
    board = next;
  }
  return { total, steps };
}

/**
 * 依「遊戲類別本身」的掉落規則連續掉落到無贏分（hasCascadeFeature 為 false 則只算單盤），
 * 與搜尋引擎大獎區間 / COMBO 搜尋使用的模型一致。回傳總贏分與實際消除次數（Combo 數）。
 */
export function cascadeToEnd(fx: GameFixture, grid: string[][], rng: number[], strips: string[][], config = makeConfig(fx), isFG = false): { total: number; combos: number } {
  const game = fx.game as unknown as {
    applyCascade: (g: string[][], c: number, rows: number[], strip: string[], d: number[], f: boolean, t: GameType) => void;
  };
  const board = grid.map(c => [...c]);
  const draw = rng.map(i => i - 1);
  let total = 0;
  let combos = 0;
  for (let n = 0; n < 20; n++) {
    const wins = paying(fx.game.evaluate(board, fx.paytable, config, fx.paylines, false));
    total += wins.reduce((s, w) => s + (w.totalWin || w.payout || 0), 0) * fx.game.getTumbleMultiplier(n, isFG);
    if (wins.length === 0 || !fx.game.hasCascadeFeature?.()) break;
    const coords = getWinningPositions(board, wins, fx.paytable, fx.gameType, undefined, fx.paylines);
    let eliminated = false;
    for (let c = 0; c < fx.reelCount; c++) {
      const rows: number[] = [];
      for (let r = 0; r < (fx.rowCounts[c] || 3); r++) {
        if (coords.get(`${c}-${r}`)?.some(i => i !== 999) && !fx.game.isSymbolUnremovable?.(board[c][r], isFG)) rows.push(r);
      }
      if (rows.length) { eliminated = true; game.applyCascade(board, c, rows, strips[c], draw, isFG, fx.gameType); }
    }
    if (!eliminated) break;
    combos++;
  }
  return { total, combos };
}

/** 羅馬：依腳本連鎖序列（初始 + 各次遞補，滾輪表依 Combo 輪替）重播，回傳每一步的贏分筆數 */
export function replayRomaChain(fx: GameFixture, chain: number[][]): { winsPerStep: number[] } {
  const roma = fx.game as unknown as RomaGame;
  const config = makeConfig(fx);
  const sets = fx.stripSets ?? {};
  let grid = roma.buildGridFromRng(chain[0], sets[0] ?? fx.strips, fx.rowCounts, fx.reelCount);
  const winsPerStep: number[] = [];
  for (let step = 0; step < chain.length; step++) {
    const wins = paying(fx.game.evaluate(grid, fx.paytable, config, fx.paylines, false));
    winsPerStep.push(wins.length);
    if (step === chain.length - 1) break;
    const coords = new Set(getWinningPositions(grid, wins, fx.paytable, fx.gameType, undefined, fx.paylines).keys());
    const setIdx = roma.getStripSetIndex(step + 1);
    grid = roma.cascadeStep(grid, coords, chain[step + 1], sets[setIdx] ?? fx.strips, fx.rowCounts);
  }
  return { winsPerStep };
}

/** 產生器分頁計算測案贏分時的環境（bet = 1、無手動金框） */
export const winCtx = (fx: GameFixture, symbol: string, isFreeGame = false): CombinationWinContext => ({
  gameType: fx.gameType, reelCount: fx.reelCount, rowCounts: fx.rowCounts, currentStrips: fx.strips, stripSets: fx.stripSets,
  currentPaytable: fx.paytable, customPaylines: fx.paylines, bet: 1, goldFrames: {}, selectedSymbol: symbol, isFreeGame,
  topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
});

/** 金框掉落型的「+WX」只在滾輪表真的有金框時成立（秦皇沒有金框，+WX 是一般百搭） */
export const usesGoldCascade = (fx: GameFixture, wildCount: number) =>
  !!getTraits(fx.gameType).goldCascadeSearch && wildCount > 0 &&
  [fx.strips, ...Object.values(fx.stripSets ?? {})].some(set => set.some(col => col.some(s => fx.game.isGoldSymbol?.(s) ?? /^G[1-9A-Z]/.test(s))));
