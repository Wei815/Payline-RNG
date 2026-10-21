/**
 * 「RNG 腳本驗證」：解析 QA JSON（RNGs / ClassIDs）並模擬每一步的盤面、掉落與贏分
 *
 * 逐字搬自 RngValidator.handleParse，改為純函式以便測試。RngValidator 元件直接呼叫此檔。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid, getWinningPositions } from '../utils/evaluation';
import { findTraits } from '../games/registry';
import { GameRegistry } from '../core/GameRegistry';
import { isMathIdRng } from './rngFormat';

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

  const isCoordinateClassId = (findTraits(gameType)?.snippetClassIds ?? 'symbolMultiplier') !== 'symbolMultiplier';

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

    if (isCoordinateClassId && flatClassIds.length > 0) {
      const newGoldFrames: Record<string, number> = {};
      const newJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {};
      const poolIndexToMultiplier: Record<number, number> = {
        0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 25, 10: 50, 11: 100
      };
      const idToType: Record<number, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {
        12: 'MINI', 13: 'MAJOR', 14: 'MEGA', 15: 'MAXWIN'
      };
      for (let i = 0; i < flatClassIds.length; i += 3) {
        const c = flatClassIds[i];
        const r = flatClassIds[i + 1];
        const v = flatClassIds[i + 2];
        if (v !== undefined) {
          const key = `${c}-${r}`;
          if (v >= 0 && v <= 11) {
            newGoldFrames[key] = poolIndexToMultiplier[v];
          } else if (v >= 12 && v <= 15) {
            newJackpots[key] = idToType[v];
          }
        }
      }
      gameConfig.goldFrames = newGoldFrames;
      gameConfig.jackpots = newJackpots;
    }

    const evWins = evaluateGrid(currentGrid, currentPaytable, gameConfig, undefined, false);
    const coords = getWinningPositions(currentGrid, evWins, currentPaytable, gameType);

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

    let hasWins = coords.size > 0;
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
        const coordsNext = getWinningPositions(nextGrid, evWinsNext, currentPaytable, gameType);

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
        hasWins = coordsNext.size > 0;
      }
    }

    const stepTotalWin = drops.reduce((sum, drop) => sum + drop.totalWin, 0);

    return {
      drops,
      totalWin: stepTotalWin
    };
  });
}
