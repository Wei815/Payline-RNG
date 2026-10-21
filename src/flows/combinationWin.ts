/**
 * 「複製全部測案」的贏分公式（Win=...）
 *
 * 逐字搬自 SlotGeneratorTab.calculateCombinationWin / generateGridFromMathIds / generateGridForComb，
 * 改為純函式以便測試。元件目前仍使用內嵌版本（待 UI 重構完成後改為呼叫此檔）。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid, getWinningPositions } from '../utils/evaluation';
import { isGoldSymbol } from '../utils/evaluation/GameConstants';
import { getTraits } from '../games/registry';

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
  const { gameType, reelCount, rowCounts, currentStrips, stripSets, currentPaytable, customPaylines, bet, goldFrames, selectedSymbol, isFreeGame } = ctx;
  const rng = comb.rng;
  if (!rng || rng.length === 0) return { formula: 'Win=0', totalWin: 0 };

  let wyConfigs: any = undefined;
  if (getTraits(gameType).wyReels) {
    wyConfigs = {};
    for (let c = 0; c < reelCount; c++) {
      wyConfigs[c] = { a: 2, b: 10, z: 0 };
    }
  }

  if (!(getTraits(gameType).family === 'way' || getTraits(gameType).family === 'megaway')) {
    const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, wyConfigs, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };
    const isMathIdGrid = getTraits(gameType).mathIdGenerator;
    const grid = isMathIdGrid ? generateGridFromMathIds(ctx, rng) : generateGridForComb(ctx, rng, comb.stripId);
    const wins = evaluateGrid(grid, currentPaytable, config, undefined, true);
    const validWins = wins.filter(w => w.totalWin > 0);
    const formulaStr = validWins.map(w => `${w.symbolId}*${w.matchCount}${w.multiplier ? `(x${w.multiplier})` : ''}=${w.totalWin}`).join('+') || '0';
    const totalWin = validWins.reduce((s, w) => s + w.totalWin, 0);
    return { formula: totalWin > 0 ? `Win=${formulaStr}=${totalWin}` : 'Win=0', totalWin };
  }

  const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, wyConfigs, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };

  const grid = generateGridForComb(ctx, rng, comb.stripId);

  let totalWinAccumulated = 0;
  let cascadeCount = 0;
  let keepCascading = true;
  const formulaParts: string[] = [];

  const parsedRng = rng.map((s: any) => parseInt(s, 10));
  const drawIndices = parsedRng.map((r: any) => r !== undefined ? r - 1 : 0);

  while (keepCascading && cascadeCount < 20) {
    const wins = evaluateGrid(grid, currentPaytable, config, undefined, true);
    if (wins.length === 0) break;

    let tumbleMultiplier = 1;
    if (getTraits(gameType).doublingTumbleMultiplier) {
      tumbleMultiplier = isFreeGame
        ? Math.min(1024, 8 * Math.pow(2, cascadeCount))
        : Math.min(1024, 1 * Math.pow(2, cascadeCount));
    }

    const validWins = wins.filter(w => w.totalWin > 0);
    let dropWinSum = 0;
    const dropFormula = validWins.map(w => `${w.symbolId}*${w.matchCount}${tumbleMultiplier > 1 ? `(x${tumbleMultiplier})` : ''}=${w.totalWin * tumbleMultiplier}`).join('+');

    validWins.forEach(w => {
      dropWinSum += w.totalWin * tumbleMultiplier;
    });

    if (dropFormula) {
      totalWinAccumulated += dropWinSum;
      formulaParts.push(dropFormula);
    }

    // Stop cascading if this drop contains the target symbol
    if (wins.some(w => w.symbolId === selectedSymbol)) {
      keepCascading = false;
    }

    const winningCoordsMap = getWinningPositions(grid, wins, currentPaytable, gameType, undefined, customPaylines);

    let targetStripSet = currentStrips;
    if (comb.stripId !== undefined) {
      if (stripSets && stripSets[comb.stripId]) {
        targetStripSet = stripSets[comb.stripId];
      }
    }

    for (let c = 0; c < grid.length; c++) {
      const strip = targetStripSet[c];
      if (!strip || strip.length === 0) continue;
      const rows = rowCounts[c] || 3;
      for (let r = rows - 1; r >= 0; r--) {
        if (winningCoordsMap.has(`${c}-${r}`)) {
          const sym = grid[c][r];
          if (getTraits(gameType).goldToWild && isGoldSymbol(sym)) {
            grid[c][r] = 'WX';
            continue;
          }

          const hasRealWin = winningCoordsMap.get(`${c}-${r}`)?.some((idx: number) => idx !== 999);
          if (hasRealWin) {
            const len = strip.length;
            const actualDrawIndex = (((drawIndices[c] % len) + len) % len);
            grid[c][r] = strip[actualDrawIndex];
            drawIndices[c]--;
          }
        }
      }
    }
    cascadeCount++;
  }

  if (formulaParts.length > 0) {
    return { formula: `Win=${formulaParts.join('+')}=${totalWinAccumulated}`, totalWin: totalWinAccumulated };
  }
  return { formula: 'Win=0', totalWin: 0 };
}
