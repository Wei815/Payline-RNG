/**
 * 「RNG 腳本驗證」：解析 QA JSON（RNGs / ClassIDs）並模擬每一步的盤面、掉落與贏分
 *
 * 逐字搬自 RngValidator.handleParse，改為純函式以便測試。RngValidator 元件直接呼叫此檔。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid, getWinningPositions, hasEliminatedCells } from '../utils/evaluation';
import { findTraits } from '../games/registry';
import { GameRegistry } from '../core/GameRegistry';
import { isMathIdRng } from './rngFormat';
import { decodeCoordinateClassIds, decodeWyClassIds } from './classIds';

export interface RngValidatorParams {
  jsonInput: string;
  gameType: GameType;
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  currentStripSets: string[][][];
  currentFreeStripSets: string[][][];
  currentPaytable: PaytableRule[];
  customPaylines?: number[][];
  isFreeGame: boolean;
  bet: number;
  betMultiplier: number;
}

export interface ValidatorDrop {
  grid: string[][];
  totalWin: number;
  originalWin: number;
  multiplier: number;
  winningCoords: Map<string, number[]>;
  goldFrames?: Record<string, number>;
  jackpots?: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>;
}

export interface ValidatorStep {
  drops: ValidatorDrop[];
  totalWin: number;
}

/** 解析失敗時拋出 Error（訊息即 UI 顯示的錯誤） */
export function parseQaSteps(p: RngValidatorParams): ValidatorStep[] {
  const { jsonInput, gameType, reelCount, rowCounts, currentStrips, currentStripSets, currentFreeStripSets, currentPaytable, customPaylines, isFreeGame, bet, betMultiplier } = p;
  const data = JSON.parse(jsonInput);
  if (!data?.QA || !data.QA[0] || !data.QA[0].RNGs) {
    throw new Error('無效的格式，找不到 QA[0].RNGs');
  }

  const rngSteps: number[][] = data.QA[0].RNGs;
  const classIds: number[][] = data.QA[0].ClassIDs || [];

  const mathIdToSymbol: Record<number, string> = {};
  currentPaytable.forEach(r => {
    if (r.mathId !== undefined) {
      const ids = String(r.mathId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      ids.forEach(id => {
        mathIdToSymbol[id] = r.symbolId;
      });
    }
  });

  const classIdMode = findTraits(gameType)?.snippetClassIds ?? 'symbolMultiplier';
  const isCoordinateClassId = classIdMode !== 'symbolMultiplier';

  return rngSteps.map((rngArray, stepIndex) => {
    const isMathId = isMathIdRng(gameType, rngArray, reelCount);

    const emptyGrid = Array.from({ length: reelCount }, (_, c) =>
      Array(rowCounts[c] || 3).fill('-')
    );

    let classIdIndex = 0;
    const flatClassIds = classIds[stepIndex] || [];

    let currentGrid: string[][];
    let idIndex = 0;
    const currentTopCursors = [...rngArray];

    let activeStrips = currentStrips;
    if (!isMathId && rngArray.length > reelCount) {
      const stripId = rngArray[reelCount];
      const targetStripSets = isFreeGame && currentFreeStripSets.length > 0 ? currentFreeStripSets : currentStripSets;
      activeStrips = targetStripSets[stripId] || currentStrips;
    }

    if (isMathId) {
      currentGrid = emptyGrid.map(col =>
        col.map(cell => {
          if (idIndex < rngArray.length) {
            const val = rngArray[idIndex++];
            let sym = mathIdToSymbol[val];
            if (sym && !isCoordinateClassId && (sym.startsWith('F') || sym.startsWith('L'))) {
              const mult = flatClassIds[classIdIndex++];
              if (mult !== undefined) {
                sym = `${sym}_${mult}X`;
              }
            }
            return sym ? sym : '-';
          }
          return cell;
        })
      );
    } else {
      currentGrid = emptyGrid.map((col, c) => {
        const start = rngArray[c] || 0;
        const len = activeStrips[c]?.length || 1;
        const strip = activeStrips[c] || ['-'];
        return col.map((_, r) => strip[(start + r) % len]);
      });
    }

    const gameConfig: any = {
      gameType: gameType as any,
      paylines: customPaylines || [],
      effectiveBet: bet,
    };

    if (classIdMode === 'coordinate' && flatClassIds.length > 0) {
      const { goldFrames, jackpots } = decodeCoordinateClassIds(flatClassIds);
      gameConfig.goldFrames = goldFrames;
      gameConfig.jackpots = jackpots;
    } else if (classIdMode === 'wyConfig' && flatClassIds.length > 0) {
      gameConfig.wyConfigs = decodeWyClassIds(flatClassIds, currentGrid);
    }

    const evWins = evaluateGrid(currentGrid, currentPaytable, gameConfig, undefined, false);
    // 中獎座標必須用與評估相同的線（未傳時會退回預設 20 線，羅馬第 6 條線起會標錯格子）
    const paylinesForCoords = customPaylines && customPaylines.length > 0 ? customPaylines : undefined;
    const coords = getWinningPositions(currentGrid, evWins, currentPaytable, gameType, undefined, paylinesForCoords);

    const gameInstance = GameRegistry.getGame(gameType);
    const initialTumbleMultiplier = gameInstance.getTumbleMultiplier(0, isFreeGame);

    const originalWinSum = evWins.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);
    const winSum = originalWinSum * initialTumbleMultiplier;

    const drops: ValidatorDrop[] = [{
      grid: currentGrid,
      totalWin: winSum,
      originalWin: originalWinSum,
      multiplier: initialTumbleMultiplier,
      winningCoords: coords,
      goldFrames: gameConfig.goldFrames,
      jackpots: gameConfig.jackpots
    }];

    // 只有 S1 高亮標記時不算中獎，不可觸發掉落
    let hasWins = hasEliminatedCells(coords);
    let dropCount = 0;
    let lastGrid = currentGrid;
    let lastCoords = coords;

    if (gameInstance.hasCascadeFeature?.()) {
      while (hasWins && dropCount < 30) {
        dropCount++;

        const nextGrid = gameInstance.calculateNextDropGrid(
          lastGrid,
          lastCoords,
          isFreeGame,
          (c) => {
            const strip = activeStrips[c] || ['-'];
            const stripLen = strip.length;
            let sym: string;
            if (isMathId) {
              if (idIndex < rngArray.length) {
                const val = rngArray[idIndex++];
                sym = mathIdToSymbol[val] || '-';
                if (sym && !isCoordinateClassId && (sym.startsWith('F') || sym.startsWith('L'))) {
                  const mult = flatClassIds[classIdIndex++];
                  if (mult !== undefined) sym = `${sym}_${mult}X`;
                }
              } else {
                sym = '0';
              }
            } else {
              currentTopCursors[c] = (currentTopCursors[c] - 1 + stripLen) % stripLen;
              sym = strip[currentTopCursors[c]];
            }
            return sym;
          }
        );

        if (!isMathId) {
          for (let c = 0; c < reelCount; c++) {
            const colWins = (lastCoords as any).get(c.toString()) || [];
            let keptCount = 0;
            for (let r = 0; r < lastGrid[c].length; r++) {
              if (!colWins.includes(r) || gameInstance.isSymbolUnremovable?.(lastGrid[c][r], isFreeGame)) {
                keptCount++;
              }
            }
            const removedCount = lastGrid[c].length - keptCount;

            if (removedCount > 0) {
              const newSymbols = nextGrid[c].slice(0, removedCount);
              newSymbols.reverse();
              nextGrid[c].splice(0, removedCount, ...newSymbols);
            }
          }
        }

        const evWinsNext = evaluateGrid(nextGrid, currentPaytable, gameConfig, undefined, false);
        const coordsNext = getWinningPositions(nextGrid, evWinsNext, currentPaytable, gameType, undefined, paylinesForCoords);

        const tumbleMultiplier = gameInstance.getTumbleMultiplier(dropCount, isFreeGame);

        const originalWinSumNext = evWinsNext.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);
        const winSumNext = originalWinSumNext * tumbleMultiplier;

        drops.push({
          grid: nextGrid,
          totalWin: winSumNext,
          originalWin: originalWinSumNext,
          multiplier: tumbleMultiplier,
          winningCoords: coordsNext,
          goldFrames: gameConfig.goldFrames,
          jackpots: gameConfig.jackpots
        });

        lastGrid = nextGrid;
        lastCoords = coordsNext;
        hasWins = hasEliminatedCells(coordsNext);
      }
    }

    const stepTotalWin = drops.reduce((sum, drop) => sum + drop.totalWin, 0);

    return {
      drops,
      totalWin: stepTotalWin
    };
  });
}
