import type { PaytableRule, GameType } from '../types';
import { evaluateGrid, defaultPaylines } from './evaluation';
import type { WinResult } from './evaluation';

// 輔助函數：將浮點數格式化為乾淨的字串，避免 JS 浮點數精度問題 (例如 0.03333333333333333 * 400 = 13.333333333333334)
export function formatAmount(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(4)).toString();
}

// 輔助函數：解析貼上的 RNG 字串並轉換成數值陣列
export function parsePasteRng(text: string, count: number, rowCounts?: number[]): string[] | null {
  const match = text.match(/\[([^\]]+)\]/);
  let numbersString = "";

  if (match && match[1]) {
    numbersString = match[1];
  } else {
    numbersString = text;
  }

  // 提取所有的數字、英文字母與底線 (允許符號或帶有倍數的ID如 F1_2X)
  const cleanStr = numbersString.replace(/[^0-9A-Za-z_]/g, ' ');
  const nums = cleanStr.trim().split(/\s+/).filter(s => s !== '');

  if (nums.length === 0) return null;

  // 如果提供的數量大於 count 並且有提供 rowCounts，表示可能是 30 格的扁平陣列，將其按欄位分拆
  if (nums.length > count && rowCounts && rowCounts.length > 0) {
    const result = Array(count).fill('');
    let idx = 0;
    for (let c = 0; c < count; c++) {
      const rows = rowCounts[c] || 3;
      const colItems = [];
      for (let r = 0; r < rows; r++) {
        colItems.push(nums[idx] !== undefined ? nums[idx] : '0');
        idx++;
      }
      result[c] = colItems.join(',');
    }
    return result;
  }

  const result = Array(count).fill('0');
  for (let i = 0; i < count; i++) {
    result[i] = nums[i] !== undefined ? nums[i] : '0';
  }

  return result;
}

// 輔助函數：取得當前盤面參與連線的所有格子座標
export interface SVGPathResult {
  path: string;
  symbolId: string;
}

// 輔助函數：計算連線的 SVG Path
export function calculateSVGPaths(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  container: HTMLDivElement | null,
  isOtherTab: boolean,
  gameType: GameType,
  topTracker?: string[],
  customPaylines?: number[][]
): SVGPathResult[] {
  if (!container || !wins || wins.length === 0) return [];
  // 針對賽特2 (payanywhere_set2) 新增的邏輯：不繪製連線 SVG
  if (gameType === 'payanywhere' || gameType === 'payanywhere_set2') return [];

  const paths: SVGPathResult[] = [];
  const containerRect = container.getBoundingClientRect();

  const wildSymbols = new Set(
    currentPaytable.filter(p => p.isWild).map(p => p.symbolId)
  );
  wildSymbols.add('WILD'); wildSymbols.add('W'); wildSymbols.add('WX');

  for (const win of wins) {
    const isScatter = currentPaytable.some(p => p.symbolId === win.symbolId && p.isScatter);
    if (isScatter) continue;

    if (gameType === 'linegame') {
      if (win.lineIndex === undefined) continue;
      const line = customPaylines && customPaylines.length > 0 ? customPaylines[win.lineIndex] : defaultPaylines[win.lineIndex];
      if (!line) continue;

      const points: string[] = [];
      let success = true;

      for (let col = 0; col < win.matchCount; col++) {
        const row = line[col];
        const cellId = isOtherTab
          ? `cell-other-${col}-${row}`
          : `cell-manual-${col}-${row}`;

        const element = document.getElementById(cellId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) - containerRect.left;
          const y = (rect.top + rect.height / 2) - containerRect.top;
          points.push(`${x},${y}`);
        } else {
          success = false;
          break;
        }
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
      let success = true;

      for (const pt of path) {
        const cellId = pt.row === -1
          ? (isOtherTab ? `cell-top-other-${pt.col - 1}` : `cell-top-manual-${pt.col - 1}`)
          : (isOtherTab ? `cell-other-${pt.col}-${pt.row}` : `cell-manual-${pt.col}-${pt.row}`);

        const element = document.getElementById(cellId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) - containerRect.left;
          const y = (rect.top + rect.height / 2) - containerRect.top;
          points.push(`${x},${y}`);
        } else {
          success = false;
          break;
        }
      }

      if (success && points.length > 1) {
        paths.push({ path: `M ${points.join(' L ')}`, symbolId: win.symbolId });
      }
    }
  }

  return paths;
}

// 定義贏分線/符號的顏色池
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
  // 若同一個格子同時參與多個贏分（例如 WILD），這裡我們簡單取第一個參與的贏分的顏色
  const index = winIndices[0] % WIN_COLORS.length;
  return WIN_COLORS[index];
}

// 輔助函數：取得當前盤面參與連線的所有格子座標
export function getWinningPositions(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTracker?: string[],
  customPaylines?: number[][]
): Map<string, number[]> {
  const winningCoords = new Map<string, number[]>();

  if (!wins || wins.length === 0) return winningCoords;

  const addCoord = (coord: string, winIndex: number) => {
    if (!winningCoords.has(coord)) winningCoords.set(coord, []);
    winningCoords.get(coord)!.push(winIndex);
  };

  const wildSymbols = new Set(
    currentPaytable.filter(p => p.isWild).map(p => p.symbolId)
  );
  wildSymbols.add('WILD'); wildSymbols.add('W'); wildSymbols.add('WX');

  for (let w = 0; w < wins.length; w++) {
    const win = wins[w];
    const isScatter = currentPaytable.some(p => p.symbolId === win.symbolId && p.isScatter);
    // 針對賽特2 (payanywhere_set2) 新增的邏輯：亮起中獎方塊
    const isPayAnywhere = gameType === 'payanywhere' || gameType === 'payanywhere_set2';

    if (isScatter || isPayAnywhere) {
      for (let col = 0; col < grid.length; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const cell = grid[col][row];
          if (cell === win.symbolId || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`${col}-${row}`, w);
          }
        }
      }
      if (gameType === 'megaway' && topTracker) {
        topTracker.forEach((cell, idx) => {
          if (cell === win.symbolId || wildSymbols.has(cell) || (win.symbolId === 'B1' && cell === 'B2')) {
            addCoord(`top-${idx}`, w);
          }
        });
      }
    } else if (gameType === 'linegame') {
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

  return winningCoords;
}

// 輔助函數：搜尋符合特定連線條件的 RNG 組態，包含嚴格搜尋與最少干擾寬鬆搜尋
export function findRngForCombination(
  targetSymbol: string,
  length: number,
  wildCount: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][]
): { rng: number[] | null; isInterfered: boolean } {
  // 建立完整的 wild 符號集合（與 evaluation.ts 保持一致）
  const wildSymbolSet = new Set<string>();
  currentPaytable.filter(p => p.isWild).forEach(p => wildSymbolSet.add(p.symbolId));
  wildSymbolSet.add('WILD');
  wildSymbolSet.add('W');
  wildSymbolSet.add('WX');
  // 也掃描 strips，確保實際存在的 wild 符號都被涵蓋
  for (const strip of currentStrips) {
    if (!strip) continue;
    for (const sym of strip) {
      if (sym === 'WILD' || sym === 'W' || sym === 'WX') wildSymbolSet.add(sym);
    }
  }

  const categories: {
    onlyOneTarget: number[];
    onlyOneWild: number[];
    anyTarget: number[];
    anyWild: number[];
    none: number[];
    centerPreferred: Set<number>;
  }[] = [];

  for (let col = 0; col < reelCount; col++) {
    const strip = currentStrips[col];
    const rows = rowCounts[col] || 3;
    const onlyOneTarget: number[] = [];
    const onlyOneWild: number[] = [];
    const anyTarget: number[] = [];
    const anyWild: number[] = [];
    const none: number[] = [];

    if (!strip || strip.length === 0) {
      categories.push({ onlyOneTarget: [], onlyOneWild: [], anyTarget: [], anyWild: [], none: [], centerPreferred: new Set() });
      continue;
    }

    const centerPreferred = new Set<number>(); // 記錄符號出現在中間行的 RNG 位置

    for (let i = 0; i < strip.length; i++) {
      const visible: string[] = [];
      for (let r = 0; r < rows; r++) {
        visible.push(strip[(i + r) % strip.length]);
      }

      const tCount = visible.filter(s => s === targetSymbol).length;
      const wCount = visible.filter(s => wildSymbolSet.has(s)).length;
      const centerRow = Math.floor(rows / 2);
      const centerSym = visible[centerRow];
      const wCenterOnly = wCount === 1 && wildSymbolSet.has(centerSym); // WX 在中間行
      const tCenterOnly = tCount === 1 && centerSym === targetSymbol; // Target 在中間行

      if (tCenterOnly && wCount === 0) {
        onlyOneTarget.push(i);
        centerPreferred.add(i);
      } else if (wCenterOnly && tCount === 0) {
        onlyOneWild.push(i);
        centerPreferred.add(i);
      } else if (tCount === 1 && wCount === 0) {
        // target 在非中間行
        onlyOneTarget.push(i);
      } else if (tCount === 0 && wCount === 1) {
        // wild 在非中間行
        onlyOneWild.push(i);
      } else if (tCount === 0 && wCount === 0) {
        none.push(i);
      }

      if (tCount > 0) anyTarget.push(i);
      if (wCount > 0) anyWild.push(i);
    }
    categories.push({ onlyOneTarget, onlyOneWild, anyTarget, anyWild, none, centerPreferred });
  }

  // WX 不需要強制在最後面，反而是越前面越好（最前面僅能到 R2，即 Index 1）
  const wildColCombinations: number[][] = [];
  if (wildCount === 0) {
    wildColCombinations.push([]);
  } else {
    // 最前僅能 R2 (Index 1)，到該連線長度的最後一欄 (Index length - 1)
    for (let col = 1; col < length; col++) {
      wildColCombinations.push([col]);
    }
  }

  const runSearch = (allowOtherWins: boolean): number[] | null => {
    let bestCandidate: number[] | null = null;
    let minScore = Infinity;
    let bestDist = Infinity;
    let bestWildColIdx = Infinity;

    for (const wildCols of wildColCombinations) {
      const isWildCol = Array(length).fill(false);
      for (const c of wildCols) isWildCol[c] = true;

      const currentWildColIdx = wildCols[0] !== undefined ? wildCols[0] : Infinity;

      const candidateRng = Array(reelCount).fill(0);
      let testCount = 0;

      const search = (colIndex: number): number[] | null => {
        testCount++;
        if (testCount > 50000) return null; // 提高限制，避免 5 滾輪搜尋提前截斷

        if (colIndex === reelCount) {
          const testGrid = Array.from({ length: reelCount }, (_, cIdx) => {
            const r = rowCounts[cIdx] || 3;
            const s = currentStrips[cIdx];
            const start = candidateRng[cIdx];
            return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
          });

          let evalGrid = testGrid;
          if (gameType === 'megaway') {
            evalGrid = testGrid.map((col, colIdx) => {
              if (colIdx >= 1 && colIdx <= 4 && topTrackerOther) {
                const topSym = (length < 5 && colIdx >= length)
                  ? '-'
                  : (topTrackerOther[colIdx - 1] || 'WX');
                return [...col, topSym];
              }
              return col;
            });
          }

          // 直接調用 evaluateGrid 判定中獎（includeZeroPayout=true 確保 match2 payout=0 也能被判定到）
          const evWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
          const targetWin = evWins.find(w => w.symbolId === targetSymbol);
          let isMatch = false;
          let ways = 1;
          if (targetWin) {
            isMatch = (targetWin.matchCount >= length);
            ways = targetWin.ways;
          }

          const otherWinsCount = evWins.filter(w => w.symbolId !== targetSymbol && !wildSymbolSet.has(w.symbolId) && w.payout > 0).length;

          // 驗證是否符合目標連線條件
          if (isMatch) {
            if (!allowOtherWins) {
              // 嚴格模式：不能有其他連線且 ways 必須為 1
              if (otherWinsCount === 0 && ways === 1) {
                return [...candidateRng];
              }
            } else {
              // 寬鬆模式：計算干擾分數並記錄最少干擾者
              const score = (ways - 1) * 10 + otherWinsCount * 20;

              // 計算當前 candidateRng 距離所有滾輪中間的總距離和
              let totalDist = 0;
              for (let c = 0; c < reelCount; c++) {
                const stripLen = currentStrips[c].length;
                const mid = Math.floor(stripLen / 2);
                totalDist += Math.abs(candidateRng[c] - mid);
              }

              if (score < minScore) {
                minScore = score;
                bestCandidate = [...candidateRng];
                bestDist = totalDist;
                bestWildColIdx = currentWildColIdx;
              } else if (score === minScore) {
                // 如果干擾分數相同，優先選擇 WX 位置越前面的（即 index 越小越好）
                if (currentWildColIdx < bestWildColIdx) {
                  bestCandidate = [...candidateRng];
                  bestDist = totalDist;
                  bestWildColIdx = currentWildColIdx;
                } else if (currentWildColIdx === bestWildColIdx) {
                  // 如果 WX 位置也相同，優先選擇總距離中間較近的
                  if (totalDist < bestDist) {
                    bestCandidate = [...candidateRng];
                    bestDist = totalDist;
                  }
                }
              }
            }
          }

          return null;
        }

        let candidates: number[] = [];
        if (colIndex < length) {
          if (isWildCol[colIndex]) {
            // WX 欄位：嚴格或寬鬆都必須在可見範圍內有 WX
            candidates = categories[colIndex].onlyOneWild;
            if (candidates.length === 0) {
              // 升級到 anyWild（允許多個 WX 或非中間行）
              candidates = categories[colIndex].anyWild;
            }
            // 若 anyWild 也是空的，說明此滾輪根本沒有 WX → 組合不存在
            if (candidates.length === 0) return null;
          } else {
            candidates = categories[colIndex].onlyOneTarget;
            if (allowOtherWins && candidates.length === 0) {
              // 寬鬆模式下退回：只要包含至少一個 targetSymbol
              candidates = categories[colIndex].anyTarget;
            }
          }
        } else {
          candidates = categories[colIndex].none;
        }

        // 寬鬆模式下，非 WX 欄位若沒有 candidates，可嘗試任意起點
        if (candidates.length === 0) {
          if (allowOtherWins) {
            candidates = Array.from({ length: currentStrips[colIndex].length }, (_, idx) => idx);
          } else {
            return null;
          }
        }

        // 依據「是否中間行」優先，再依距離中心點排序
        const stripLen = currentStrips[colIndex].length;
        const mid = Math.floor(stripLen / 2);
        const cp = categories[colIndex].centerPreferred;
        const sortedCandidates = [...candidates].sort((a, b) => {
          const aCenter = cp.has(a) ? 0 : 1;
          const bCenter = cp.has(b) ? 0 : 1;
          if (aCenter !== bCenter) return aCenter - bCenter;
          return Math.abs(a - mid) - Math.abs(b - mid);
        });

        const limit = Math.min(sortedCandidates.length, 5);
        for (let attempt = 0; attempt < limit; attempt++) {
          candidateRng[colIndex] = sortedCandidates[attempt];
          const res = search(colIndex + 1);
          if (res && !allowOtherWins) return res;
        }
        return null;
      };

      const res = search(0);
      if (res && !allowOtherWins) return res;
    }

    return allowOtherWins ? bestCandidate : null;
  };

  // 1. 優先嘗試無干擾嚴格搜尋
  const strictResult = runSearch(false);
  if (strictResult) {
    return { rng: strictResult, isInterfered: false };
  }

  // 2. 找不到則退回寬鬆搜尋 (尋找最少干擾的 RNG)
  const fallbackResult = runSearch(true);
  if (fallbackResult) {
    // 重新評估這個 fallbackResult 以確認是否有其他贏分連線 (payout > 0)
    const testGrid = fallbackResult.map((start, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = currentStrips[cIdx];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });

    let evalGrid = testGrid;
    if (gameType === 'megaway' && topTrackerOther) {
      evalGrid = testGrid.map((col, colIdx) => {
        if (colIdx >= 1 && colIdx <= 4) {
          const topSym = (length < 5 && colIdx >= length)
            ? '-'
            : (topTrackerOther[colIdx - 1] || 'WX');
          return [...col, topSym];
        }
        return col;
      });
    }

    const evWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
    const otherWinsCount = evWins.filter(w => w.symbolId !== targetSymbol && !wildSymbolSet.has(w.symbolId) && w.payout > 0).length;

    return { rng: fallbackResult, isInterfered: otherWinsCount > 0 };
  }

  return { rng: null, isInterfered: false };
}
