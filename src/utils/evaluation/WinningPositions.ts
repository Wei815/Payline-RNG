import type { PaytableRule, GameType } from '../../types';
import type { WinResult } from '../evaluation';
import { defaultPaylines } from '../evaluation';

export function getWinningPositions(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTracker?: string[],
  customPaylines?: number[][]
): Map<string, number[]> {
  const winningCoords = new Map<string, number[]>();

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
    const isPayAnywhere = gameType === 'payanywhere' || gameType === 'payanywhere_set2';

    if (isScatter || isPayAnywhere) {
      scatterPayAnywhereWins.push({ w, symbolId: win.symbolId });
      scatterPayAnywhereSet.add(win.symbolId);
      if (win.symbolId === 'B1') scatterPayAnywhereSet.add('B2');
    } else if (gameType === 'linegame' || gameType === 'linegame_set2') {
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
      }
    } else {
      for (let col = 0; col < win.matchCount; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const cell = grid[col][row];
          if (cell === win.symbolId || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`${col}-${row}`, w);
          }
        }
        if (gameType === 'megaway' && col >= 1 && col <= 4 && topTracker) {
          const cell = topTracker[col - 1];
          if (cell === win.symbolId || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`top-${col - 1}`, w);
          }
        }
      }
    }
  }

  if (scatterPayAnywhereWins.length > 0) {
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        if (scatterPayAnywhereSet.has(cell) || wildSymbols.has(cell)) {
          for (const sw of scatterPayAnywhereWins) {
            if (cell === sw.symbolId || wildSymbols.has(cell) || (sw.symbolId === 'B1' && cell === 'B2')) {
              addCoord(`${col}-${row}`, sw.w);
            }
          }
        }
      }
    }
    if (gameType === 'megaway' && topTracker) {
      topTracker.forEach((cell, idx) => {
        if (scatterPayAnywhereSet.has(cell) || wildSymbols.has(cell)) {
          for (const sw of scatterPayAnywhereWins) {
            if (cell === sw.symbolId || wildSymbols.has(cell) || (sw.symbolId === 'B1' && cell === 'B2')) {
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

  return winningCoords;
}
