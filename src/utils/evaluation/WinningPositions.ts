import type { PaytableRule, GameType } from '../../types';
import type { WinResult } from '../evaluation';
import { defaultPaylines } from '../evaluation';
import { getBaseSymbol } from './GameConstants';
import { GameRegistry } from '../../core/GameRegistry';
import { getFamily } from '../../games/registry';

/** S1 不論是否中獎都會以此索引標記（僅供高亮），不代表中獎 */
export const HIGHLIGHT_ONLY_INDEX = 999;

/** 該格是否因中獎而需消除（只有 HIGHLIGHT_ONLY_INDEX 的格子不算） */
export function isEliminatedCell(winningCoords: Map<string, number[]>, key: string): boolean {
  return !!winningCoords.get(key)?.some(idx => idx !== HIGHLIGHT_ONLY_INDEX);
}

/** 盤面上是否有任何需要消除的中獎格 */
export function hasEliminatedCells(winningCoords: Map<string, number[]>): boolean {
  for (const key of winningCoords.keys()) if (isEliminatedCell(winningCoords, key)) return true;
  return false;
}

export function getWinningPositions(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTracker?: string[],
  customPaylines?: number[][]
): Map<string, number[]> {
  const winningCoords = new Map<string, number[]>();
  const family = getFamily(gameType);

  if (!wins || wins.length === 0) {
    // Even if no wins, we still highlight S1 if it's on the board
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        if (grid[col][row] === 'S1') {
          if (!winningCoords.has(`${col}-${row}`)) winningCoords.set(`${col}-${row}`, []);
          winningCoords.get(`${col}-${row}`)!.push(999);
        }
      }
    }
    return winningCoords;
  }

  const addCoord = (coord: string, winIndex: number) => {
    if (!winningCoords.has(coord)) winningCoords.set(coord, []);
    winningCoords.get(coord)!.push(winIndex);
  };

  const wildSymbols = new Set(
    currentPaytable.filter(p => p.isWild).map(p => p.symbolId)
  );
  wildSymbols.add('WILD'); wildSymbols.add('W'); wildSymbols.add('WX');

  const scatterPayAnywhereWins: { w: number; symbolId: string }[] = [];
  const scatterPayAnywhereSet = new Set<string>();

  for (let w = 0; w < wins.length; w++) {
    const win = wins[w];
    const isScatter = currentPaytable.some(p => p.symbolId === win.symbolId && p.isScatter);
    const isPayAnywhere = family === 'payanywhere';

    if (isScatter || isPayAnywhere) {
      scatterPayAnywhereWins.push({ w, symbolId: win.symbolId });
      scatterPayAnywhereSet.add(win.symbolId);
      if (win.symbolId === 'B1') scatterPayAnywhereSet.add('B2');
    } else if (family === 'line') {
      if (win.lineIndex !== undefined) {
        const line = customPaylines && customPaylines.length > 0 ? customPaylines[win.lineIndex] : defaultPaylines[win.lineIndex];
        if (line) {
          for (let col = 0; col < win.matchCount; col++) {
            const row = line[col];
            if (row !== undefined && row < grid[col].length) {
              addCoord(`${col}-${row}`, w);
            }
          }
        }
      } else if (win.isJackpot) {
        // For Jackpots or S1 Collection, highlight the source symbols
        if (win.symbolId === 'S1 收集') {
          for (let col = 0; col < grid.length; col++) {
            for (let row = 0; row < grid[col].length; row++) {
              if (grid[col][row] === 'S1') {
                addCoord(`${col}-${row}`, w);
              }
            }
          }
        }
      }
    } else {
      for (let col = 0; col < win.matchCount; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const cell = grid[col][row];
          if (getBaseSymbol(cell) === getBaseSymbol(win.symbolId) || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`${col}-${row}`, w);
          }
        }
        if (family === 'megaway' && col >= 1 && col <= 4 && topTracker) {
          const cell = topTracker[col - 1];
          if (getBaseSymbol(cell) === getBaseSymbol(win.symbolId) || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`top-${col - 1}`, w);
          }
        }
      }
    }
  }

  // Scatter / 全盤消除只計算符號本身（ScatterStrategy、PayAnywhereStrategy 都不把百搭算進個數），
  // 百搭不可標成中獎格（曾經盤面上所有 WX 都隨 Scatter 中獎一起被消除）
  if (scatterPayAnywhereWins.length > 0) {
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        if (scatterPayAnywhereSet.has(cell)) {
          for (const sw of scatterPayAnywhereWins) {
            if (getBaseSymbol(cell) === getBaseSymbol(sw.symbolId) || (sw.symbolId === 'B1' && cell === 'B2')) {
              addCoord(`${col}-${row}`, sw.w);
            }
          }
        }
      }
    }
    if (family === 'megaway' && topTracker) {
      topTracker.forEach((cell, idx) => {
        if (scatterPayAnywhereSet.has(cell)) {
          for (const sw of scatterPayAnywhereWins) {
            if (getBaseSymbol(cell) === getBaseSymbol(sw.symbolId) || (sw.symbolId === 'B1' && cell === 'B2')) {
              addCoord(`top-${idx}`, sw.w);
            }
          }
        }
      });
    }
  }

  // Always highlight S1 regardless of wins
  for (let col = 0; col < grid.length; col++) {
    for (let row = 0; row < grid[col].length; row++) {
      if (grid[col][row] === 'S1') {
        if (!winningCoords.has(`${col}-${row}`)) winningCoords.set(`${col}-${row}`, []);
        // Only push if it doesn't already have a win index, or just push 999
        if (!winningCoords.get(`${col}-${row}`)!.includes(999)) {
          winningCoords.get(`${col}-${row}`)!.push(999);
        }
      }
    }
  }

  // 遊戲專屬的中獎座標規則（例如羅馬 B1 少於 3 顆隨贏分一起消除）
  GameRegistry.tryGetGame(gameType)?.postProcessWinningPositions?.(grid, wins, winningCoords);

  return winningCoords;
}
