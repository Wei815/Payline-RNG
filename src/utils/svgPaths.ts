import type { PaytableRule, GameType } from '../types';
import { defaultPaylines } from './evaluation';
import type { WinResult } from './evaluation';


export interface SVGPathResult {
  path: string;
  symbolId: string;
}

export function calculateSVGPaths(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  _container: HTMLDivElement | null,
  _idPrefix: string,
  gameType: GameType,
  topTracker?: string[],
  customPaylines?: number[][]
): SVGPathResult[] {
  if (!wins || wins.length === 0) return [];
  if (gameType === 'payanywhere' || gameType === 'payanywhere_set2') return [];

  const paths: SVGPathResult[] = [];
  const cols = grid.length;
  if (cols === 0) return [];
  const maxRows = Math.max(...grid.map(c => c.length));
  const gridHeight = maxRows * 80 + (maxRows - 1) * 12;

  const getCellCenter = (col: number, row: number) => {
    if (row === -1) {
      const topCell = document.getElementById(`cell-${_idPrefix}-top-${col}`);
      if (topCell && _container) {
        const rect = topCell.getBoundingClientRect();
        const containerRect = _container.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2
        };
      }
      return { x: col * 92 + 40, y: 40 };
    }
    const cell = document.getElementById(`cell-${_idPrefix}-${col}-${row}`);
    if (cell && _container) {
      const rect = cell.getBoundingClientRect();
      const containerRect = _container.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
      };
    }
    // Fallback if DOM element not found
    const rowsInCol = grid[col]?.length || 3;
    const colHeight = rowsInCol * 80 + (rowsInCol - 1) * 12;
    const startY = (gridHeight - colHeight) / 2;
    const yOffset = gameType === 'megaway' ? 84 : 0;
    const y = yOffset + startY + row * 92 + 40;
    return { x: col * 92 + 40, y };
  };

  const wildSymbols = new Set(
    currentPaytable.filter(p => p.isWild).map(p => p.symbolId)
  );
  wildSymbols.add('WILD'); wildSymbols.add('W'); wildSymbols.add('WX');

  for (const win of wins) {
    const isScatter = currentPaytable.some(p => p.symbolId === win.symbolId && p.isScatter);
    if (isScatter) continue;

    if (gameType === 'linegame' || gameType === 'linegame_set2') {
      if (win.lineIndex === undefined) continue;
      const line = customPaylines && customPaylines.length > 0 ? customPaylines[win.lineIndex] : defaultPaylines[win.lineIndex];
      if (!line) continue;

      const points: string[] = [];
      let success = true;

      for (let col = 0; col < win.matchCount; col++) {
        const row = line[col];
        if (row === undefined) { success = false; break; }
        const { x, y } = getCellCenter(col, row);
        points.push(`${x},${y}`);
      }

      if (success && points.length > 1) {
        paths.push({ path: `M ${points.join(' L ')}`, symbolId: win.symbolId });
      }
      continue;
    }

    const winningRowsPerCol: number[][] = [];
    for (let col = 0; col < win.matchCount; col++) {
      const activeRows: number[] = [];
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        if (cell === win.symbolId || wildSymbols.has(cell)) {
          activeRows.push(row);
        }
      }
      if (gameType === 'megaway' && col >= 1 && col <= 4 && topTracker) {
        const topSym = topTracker[col - 1];
        if (topSym === win.symbolId || wildSymbols.has(topSym)) {
          activeRows.push(-1);
        }
      }
      winningRowsPerCol.push(activeRows);
    }

    const pathsCoords: { col: number; row: number }[][] = [];
    const buildPaths = (colIdx: number, currentPath: { col: number; row: number }[]) => {
      if (colIdx === win.matchCount) {
        pathsCoords.push([...currentPath]);
        return;
      }
      const rows = winningRowsPerCol[colIdx];
      if (!rows || rows.length === 0) return;

      for (const row of rows) {
        currentPath.push({ col: colIdx, row });
        buildPaths(colIdx + 1, currentPath);
        currentPath.pop();
      }
    };
    buildPaths(0, []);

    for (const path of pathsCoords) {
      const points: string[] = [];

      for (const pt of path) {
        const { x, y } = getCellCenter(pt.col, pt.row);
        points.push(`${x},${y}`);
      }

      if (points.length > 1) {
        paths.push({ path: `M ${points.join(' L ')}`, symbolId: win.symbolId });
      }
    }
  }

  return paths;
}

const WIN_COLORS = [
  'ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]',
  'ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]',
  'ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]',
  'ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]',
  'ring-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]',
  'ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.8)]',
  'ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]',
  'ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]'
];

export function getWinColorClass(winIndices: number[] | undefined): string {
  if (!winIndices || winIndices.length === 0) return '';
  const index = winIndices[0] % WIN_COLORS.length;
  return WIN_COLORS[index];
}


