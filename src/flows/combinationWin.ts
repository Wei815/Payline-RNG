/**
 * 「複製全部測案」的贏分公式（Win=...）
 *
 * 依遊戲類別本身的規則計算（與搜尋引擎的 COMBO / 大獎區間搜尋同一套）：
 * - 掉落：遊戲的 applyCascade（例如皇家金象只有第 3、4 軸金框轉 WX）
 * - 不可消除符號：遊戲的 isSymbolUnremovable
 * - 連續掉落倍數：遊戲的 getTumbleMultiplier
 * - 只計有贏分的中獎，持續掉落直到沒有任何消除
 * 遞補由腳本下一行 RNG 決定的遊戲（例如羅馬，實作 findRefillRng）與 MathID 遊戲只計算本盤。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid, getWinningPositions } from '../utils/evaluation';
import { getTraits } from '../games/registry';
import { GameRegistry } from '../core/GameRegistry';
import type { AbstractGame } from '../games/base/AbstractGame';
import type { IGameEnvironment } from '../games/base/IGameEnvironment';

export interface CombinationWinContext {
  gameType: GameType;
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  stripSets?: Record<string, string[][]>;
  currentPaytable: PaytableRule[];
  customPaylines?: number[][];
  bet: number;
  goldFrames: Record<string, number>;
  selectedSymbol: string;
  isFreeGame: boolean;
  topTrackerOther: string[];
}

export function generateGridFromMathIds(ctx: CombinationWinContext, rngStrArray: string[]): string[][] {
  const { currentPaytable, reelCount, rowCounts, gameType } = ctx;
  const mathIdToSymbol: Record<string, string> = {};
  currentPaytable.forEach(p => {
    if (p.mathId !== undefined) {
      const ids = String(p.mathId).split(',').map(s => s.trim());
      ids.forEach(id => {
        mathIdToSymbol[id] = p.symbolId;
      });
    }
  });

  const grid: string[][] = [];
  for (let c = 0; c < reelCount; c++) {
    const colStr = rngStrArray[c];
    if (!colStr) {
      grid.push(Array(rowCounts[c] || 3).fill('-'));
      continue;
    }
    const mathIds = colStr.split(',');
    const colSymbols = mathIds.map(mId => {
      let sym = mathIdToSymbol[mId] || mId;
      if (mId === "15" && getTraits(gameType).ballMathIds) sym = "F1";
      if (mId === "19" && getTraits(gameType).ballMathIds) sym = "L1";
      return sym;
    });
    grid.push(colSymbols);
  }
  return grid;
}

export function generateGridForComb(ctx: CombinationWinContext, rngStrArray: any[], stripId?: number): string[][] {
  const { reelCount, rowCounts, gameType, currentStrips, stripSets, topTrackerOther } = ctx;
  const rawGrid = Array(reelCount).fill(null).map((_, colIndex) => {
    const rowsForThisCol = rowCounts[colIndex] || 3;
    if (getTraits(gameType).family === 'megaway' && colIndex >= 1 && colIndex <= 4) {
      return Array(rowsForThisCol + 1).fill('-');
    }
    return Array(rowsForThisCol).fill('-');
  });

  const parsedRng = rngStrArray.map(s => parseInt(s, 10));

  let targetStripSet = currentStrips;
  if (stripId !== undefined) {
    if (stripSets && stripSets[stripId]) {
      targetStripSet = stripSets[stripId];
    }
  }

  return rawGrid.map((_col, colIndex) => {
    const rowsForThisCol = rowCounts[colIndex] || 3;
    const isMegawayTop = getTraits(gameType).family === 'megaway' && colIndex >= 1 && colIndex <= 4;
    const totalRows = isMegawayTop ? rowsForThisCol + 1 : rowsForThisCol;

    const strip = targetStripSet[colIndex];
    const rngIndex = parsedRng[colIndex];
    const startIdx = rngIndex !== undefined ? rngIndex : 0;

    const res = Array(totalRows).fill('-');
    let writeIdx = 0;
    if (strip && strip.length > 0) {
      for (let r = 0; r < rowsForThisCol; r++) {
        res[writeIdx++] = strip[(startIdx + r) % strip.length];
      }
    }
    if (isMegawayTop) {
      res[writeIdx] = topTrackerOther[colIndex - 1] || 'WX';
    }
    return res;
  });
}

export function calculateCombinationWin(ctx: CombinationWinContext, comb: any): { formula: string; totalWin: number } {
  const { gameType, reelCount, rowCounts, currentStrips, stripSets, currentPaytable, customPaylines, bet, goldFrames, isFreeGame, topTrackerOther } = ctx;
  const rng = comb.rng;
  if (!rng || rng.length === 0) return { formula: 'Win=0', totalWin: 0 };

  const traits = getTraits(gameType);
  let wyConfigs: any = undefined;
  if (traits.wyReels) {
    wyConfigs = {};
    for (let c = 0; c < reelCount; c++) {
      wyConfigs[c] = { a: 2, b: 10, z: 0 };
    }
  }
  const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, wyConfigs, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };
  const fmt = (w: { symbolId: string; matchCount: number; multiplier?: number }, total: number, mult: number) =>
    `${w.symbolId}*${w.matchCount}${w.multiplier ? `(x${w.multiplier})` : ''}${mult > 1 ? `(x${mult})` : ''}=${total}`;

  const game = GameRegistry.tryGetGame(gameType) as (AbstractGame & IGameEnvironment) | undefined;
  const cascades = !!game && game.hasCascadeFeature() && !game.findRefillRng && !traits.mathIdGenerator;

  if (!cascades) {
    const grid = traits.mathIdGenerator ? generateGridFromMathIds(ctx, rng) : generateGridForComb(ctx, rng, comb.stripId);
    const wins = evaluateGrid(grid, currentPaytable, config, undefined, false).filter(w => w.totalWin > 0);
    const totalWin = wins.reduce((s, w) => s + w.totalWin, 0);
    return { formula: totalWin > 0 ? `Win=${wins.map(w => fmt(w, w.totalWin, 1)).join('+')}=${totalWin}` : 'Win=0', totalWin };
  }

  const strips = comb.stripId !== undefined && stripSets?.[comb.stripId] ? stripSets[comb.stripId] : currentStrips;
  const grid = generateGridForComb(ctx, rng, comb.stripId);
  const drawIndices: number[] = rng.map((r: any) => parseInt(r, 10) - 1);
  const parts: string[] = [];
  let totalWin = 0;

  for (let cascadeCount = 0; cascadeCount < 20; cascadeCount++) {
    const evalGrid = game.getEvalGridForCombos(grid, topTrackerOther);
    const wins = game.evaluate(evalGrid, currentPaytable, config, customPaylines, false).filter(w => w.payout > 0);
    if (wins.length === 0) break;

    const mult = game.getTumbleMultiplier(cascadeCount, isFreeGame);
    parts.push(wins.map(w => fmt(w, (w.totalWin || w.payout || 0) * mult, mult)).join('+'));
    totalWin += wins.reduce((s, w) => s + (w.totalWin || w.payout || 0), 0) * mult;

    const coords = getWinningPositions(evalGrid, wins, currentPaytable, gameType, undefined, customPaylines);
    let eliminated = false;
    for (let c = 0; c < reelCount; c++) {
      const rows: number[] = [];
      for (let r = 0; r < (rowCounts[c] || 3); r++) {
        if (game.isSymbolUnremovable(grid[c][r], isFreeGame)) continue;
        if (coords.get(`${c}-${r}`)?.some(idx => idx !== 999)) rows.push(r);
      }
      if (rows.length > 0) {
        eliminated = true;
        game.applyCascade(grid, c, rows, strips[c], drawIndices, isFreeGame, gameType);
      }
    }
    if (!eliminated) break;
  }

  return { formula: totalWin > 0 ? `Win=${parts.join('+')}=${totalWin}` : 'Win=0', totalWin };
}
