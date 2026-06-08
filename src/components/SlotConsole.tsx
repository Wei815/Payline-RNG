import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PaytableRule, GameType } from '../types';
import { evaluateGrid, defaultPaylines } from '../utils/evaluation';
import type { WinResult } from '../utils/evaluation';

interface SlotConsoleProps {
  isRunning: boolean;
  progress: number;
  currentSpins: number;
  currentGrid: string[][];
  totalSpins: number;
  reelCount: number;
  rowCounts: number[];
  onRowCountsChange: (rows: number[]) => void;
  currentStrips: string[][];
  currentPaytable: PaytableRule[];
  coin: number;
  gameType: GameType;
}

// 輔助函數：解析貼上的 RNG 字串並轉換成數值陣列
function parsePasteRng(text: string, count: number): string[] | null {
  const match = text.match(/\[([^\]]+)\]/);
  let numbersString = "";

  if (match && match[1]) {
    numbersString = match[1];
  } else {
    numbersString = text;
  }

  // 提取所有的數字
  const cleanStr = numbersString.replace(/[^0-9]/g, ' ');
  const nums = cleanStr.trim().split(/\s+/).filter(s => s !== '');

  if (nums.length === 0) return null;

  const result = Array(count).fill('0');
  for (let i = 0; i < count; i++) {
    result[i] = nums[i] !== undefined ? nums[i] : '0';
  }

  return result;
}

// 輔助函數：取得當前盤面參與連線的所有格子座標
function getWinningPositions(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTracker?: string[]
): Set<string> {
  const winningCoords = new Set<string>();

  if (!wins || wins.length === 0) return winningCoords;

  const wildSymbols = new Set(
    currentPaytable.filter(p => p.isWild).map(p => p.symbolId)
  );
  wildSymbols.add('WILD'); wildSymbols.add('W'); wildSymbols.add('WX');

  for (const win of wins) {
    const isScatter = currentPaytable.some(p => p.symbolId === win.symbolId && p.isScatter);
    const isPayAnywhere = gameType === 'payanywhere';

    if (isScatter || isPayAnywhere) {
      for (let col = 0; col < grid.length; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const cell = grid[col][row];
          if (cell === win.symbolId || wildSymbols.has(cell)) {
            winningCoords.add(`${col}-${row}`);
          }
        }
      }
      if (gameType === 'megaway' && topTracker) {
        topTracker.forEach((cell, idx) => {
          if (cell === win.symbolId || wildSymbols.has(cell)) {
            winningCoords.add(`top-${idx}`);
          }
        });
      }
    } else if (gameType === 'linegame') {
      if (win.lineIndex !== undefined) {
        const line = defaultPaylines[win.lineIndex];
        if (line) {
          for (let col = 0; col < win.matchCount; col++) {
            const row = line[col];
            if (row !== undefined && row < grid[col].length) {
              winningCoords.add(`${col}-${row}`);
            }
          }
        }
      }
    } else {
      for (let col = 0; col < win.matchCount; col++) {
        for (let row = 0; row < grid[col].length; row++) {
          const cell = grid[col][row];
          if (cell === win.symbolId || wildSymbols.has(cell)) {
            winningCoords.add(`${col}-${row}`);
          }
        }
        if (gameType === 'megaway' && col >= 1 && col <= 4 && topTracker) {
          const cell = topTracker[col - 1];
          if (cell === win.symbolId || wildSymbols.has(cell)) {
            winningCoords.add(`top-${col - 1}`);
          }
        }
      }
    }
  }

  return winningCoords;
}

// 輔助函數：計算連線的 SVG Path
function calculateSVGPaths(
  grid: string[][],
  wins: WinResult[],
  currentPaytable: PaytableRule[],
  container: HTMLDivElement | null,
  isOtherTab: boolean,
  gameType: GameType,
  topTracker?: string[]
): string[] {
  if (!container || !wins || wins.length === 0) return [];
  if (gameType === 'payanywhere') return [];

  const paths: string[] = [];
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
      const line = defaultPaylines[win.lineIndex];
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
        paths.push(`M ${points.join(' L ')}`);
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
        paths.push(`M ${points.join(' L ')}`);
      }
    }
  }

  return paths;
}

// 輔助函數：搜尋符合特定連線條件的 RNG 組態，包含嚴格搜尋與最少干擾寬鬆搜尋
function findRngForCombination(
  targetSymbol: string,
  length: number,
  wildCount: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[]
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

  // WX 固定放在連線的最後一欄（由左至右：S1...S1 WX）
  // 例如 "S1 * 1 + WX" (L=2, W=1) → wildCols = [1]（第 2 欄是 WX）
  const wildColCombinations: number[][] = wildCount === 0
    ? [[]]
    : [[length - 1]]; // WX 永遠在最後一欄

  // 搜尋函數核心
  const runSearch = (allowOtherWins: boolean): number[] | null => {
    let bestCandidate: number[] | null = null;
    let minScore = Infinity;
    let bestDist = Infinity;

    for (const wildCols of wildColCombinations) {
      const isWildCol = Array(length).fill(false);
      for (const c of wildCols) isWildCol[c] = true;

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
                const topSym = topTrackerOther[colIdx - 1] || 'WX';
                return [...col, topSym];
              }
              return col;
            });
          }

          // 直接調用 evaluateGrid 判定中獎（includeZeroPayout=true 確保 match2 payout=0 也能被判定到）
          const evWins = evaluateGrid(evalGrid, currentPaytable, gameType, undefined, true);
          const targetWin = evWins.find(w => w.symbolId === targetSymbol);
          let isMatch = false;
          let ways = 1;
          if (targetWin) {
            isMatch = (targetWin.matchCount === length);
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
              } else if (score === minScore) {
                // 如果干擾分數相同，優先選擇總距離中間較近的
                if (totalDist < bestDist) {
                  bestCandidate = [...candidateRng];
                  bestDist = totalDist;
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
    return { rng: fallbackResult, isInterfered: true };
  }

  return { rng: null, isInterfered: false };
}

export const SlotConsole: React.FC<SlotConsoleProps> = ({ isRunning, progress: _progress, currentSpins: _currentSpins, currentGrid, totalSpins: _totalSpins, reelCount, rowCounts, onRowCountsChange, currentStrips, currentPaytable, coin, gameType }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'other'>('manual');
  const [manualIndices, setManualIndices] = useState<string[]>(Array(reelCount).fill(''));
  const [manualIndicesOther, setManualIndicesOther] = useState<string[]>(Array(reelCount).fill(''));
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [topTracker, setTopTracker] = useState<string[]>(Array(4).fill('WX'));
  const [topTrackerOther, setTopTrackerOther] = useState<string[]>(Array(4).fill('WX'));
  const [combinations, setCombinations] = useState<{
    name: string;
    length: number;
    wildCount: number;
    rng: number[] | null;
    isInterfered: boolean;
  }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // SVG 連線狀態與 DOM Refs
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRefOther = useRef<HTMLDivElement>(null);
  const [linePaths, setLinePaths] = useState<string[]>([]);
  const [linePathsOther, setLinePathsOther] = useState<string[]>([]);

  useEffect(() => {
    setManualIndices(Array(reelCount).fill(''));
    setManualIndicesOther(Array(reelCount).fill(''));
  }, [reelCount]);

  // 分組與排序邏輯 (同 Paytable Editor 三個區塊，並按指定順序排序)
  const groupedSymbols = useMemo(() => {
    const allSyms = new Set<string>();
    currentStrips.forEach(strip => {
      if (!strip) return;
      strip.forEach(s => {
        if (s && s !== 'WILD' && s !== 'W' && s !== 'WX' && s !== '-' && s !== '') {
          allSyms.add(s);
        }
      });
    });

    if (allSyms.size === 0) {
      currentPaytable.forEach(r => {
        if (r.symbolId && r.symbolId !== 'WILD' && r.symbolId !== 'W' && r.symbolId !== 'WX') {
          allSyms.add(r.symbolId);
        }
      });
    }

    const symList = Array.from(allSyms);
    const order = ['WW', 'WX', 'B1', 'S1', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'A', 'K', 'Q', 'J', 'TE', 'NI'];

    const getBase = (sym: string): string => {
      const s = sym.toUpperCase();
      if (s === 'WILD' || s === 'WX' || s === 'WW') return 'WX';
      if (s === 'WT' || s === 'WTE') return 'TE';
      if (s === 'WN' || s === 'WNI') return 'NI';
      if (/^W\d+$/.test(s)) return `M${s.substring(1)}`;
      if (/^W[AKQJ]$/.test(s)) return s.substring(1);
      return s;
    };

    const getOrderScore = (sym: string): number => {
      const base = getBase(sym);
      const idx = order.indexOf(base);
      return idx === -1 ? 999 : idx;
    };

    // 依據 order 排列
    const sorted = symList.sort((a, b) => getOrderScore(a) - getOrderScore(b));

    // 分成三個區塊
    const others: string[] = [];
    const mnum: string[] = [];
    const mlet: string[] = [];

    sorted.forEach(sym => {
      const base = getBase(sym);
      const b = base.toUpperCase();
      if (b === 'WX' || b === 'WILD' || b === 'WW' || b === 'B1' || b === 'S1') {
        others.push(sym);
      } else if (/^M\d+$/.test(b)) {
        mnum.push(sym);
      } else if (['A', 'K', 'Q', 'J', 'TE', 'NI', 'T', 'N'].includes(b)) {
        mlet.push(sym);
      } else {
        others.push(sym);
      }
    });

    return [
      { id: 'others', title: '第一區塊 (其他)', list: others },
      { id: 'mnum', title: '第二區塊 (M數字)', list: mnum },
      { id: 'mlet', title: '第三區塊 (M字母)', list: mlet }
    ].filter(g => g.list.length > 0);
  }, [currentStrips, currentPaytable]);

  // 平坦化 symbols 陣列以維持原有的狀態管理與預設選取
  const symbols = useMemo(() => {
    const list: string[] = [];
    groupedSymbols.forEach(g => {
      g.list.forEach(sym => list.push(sym));
    });
    return list;
  }, [groupedSymbols]);

  // 當 symbols 更新，自動選取第一個
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }, [symbols, selectedSymbol]);

  // 當選擇的 symbol 或配置變更時，背景搜尋所有可能的連線排列組合
  useEffect(() => {
    if (!selectedSymbol || currentStrips.length === 0 || currentStrips.every(s => !s || s.length === 0)) {
      setCombinations([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const newCombs: typeof combinations = [];

      for (let L = 2; L <= reelCount; L++) {
        const maxWild = Math.min(1, L - 1);
        for (let W = 0; W <= maxWild; W++) {
          const name = W === 0
            ? `${selectedSymbol} * ${L} 連線`
            : `${selectedSymbol} * ${L - W} + WX`;

          const { rng, isInterfered } = findRngForCombination(
            selectedSymbol,
            L,
            W,
            currentStrips,
            rowCounts,
            currentPaytable,
            reelCount,
            gameType,
            topTrackerOther
          );

          newCombs.push({
            name,
            length: L,
            wildCount: W,
            rng,
            isInterfered
          });
        }
      }
      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther]);

  // Tab 1: Manual Indices grid
  const displayGrid = Array.from({ length: reelCount }, (_, colIndex) => {
    const rowsForThisCol = rowCounts[colIndex] || 3;
    const strip = currentStrips[colIndex];
    const manualInput = manualIndices[colIndex];

    if (strip && strip.length > 0 && manualInput !== '' && !isNaN(Number(manualInput))) {
      const startIndex = Number(manualInput);
      return Array.from({ length: rowsForThisCol }).map((_, rIndex) => {
        const actualIndex = (startIndex + rIndex) % strip.length;
        return strip[actualIndex];
      });
    }

    if (currentGrid.length > 0 && currentGrid[colIndex]) {
      return currentGrid[colIndex];
    }

    return Array(rowsForThisCol).fill('-');
  });

  const wins = useMemo(() => {
    let finalGrid = displayGrid;
    if (gameType === 'megaway') {
      finalGrid = displayGrid.map((col, colIdx) => {
        if (colIdx >= 1 && colIdx <= 4) {
          const topSym = topTracker[colIdx - 1] || 'WX';
          return [...col, topSym];
        }
        return col;
      });
    }
    return evaluateGrid(finalGrid, currentPaytable, gameType);
  }, [displayGrid, currentPaytable, gameType, topTracker]);

  // Tab 2: Other Indices grid
  const displayGridOther = Array.from({ length: reelCount }, (_, colIndex) => {
    const rowsForThisCol = rowCounts[colIndex] || 3;
    const strip = currentStrips[colIndex];
    const manualInput = manualIndicesOther[colIndex];

    if (strip && strip.length > 0 && manualInput !== '' && !isNaN(Number(manualInput))) {
      const startIndex = Number(manualInput);
      return Array.from({ length: rowsForThisCol }).map((_, rIndex) => {
        const actualIndex = (startIndex + rIndex) % strip.length;
        return strip[actualIndex];
      });
    }

    if (currentGrid.length > 0 && currentGrid[colIndex]) {
      return currentGrid[colIndex];
    }

    return Array(rowsForThisCol).fill('-');
  });

  // 核心邏輯：物理計算贏分結果
  const winsOther = useMemo(() => {
    let finalGrid = displayGridOther;
    if (gameType === 'megaway') {
      finalGrid = displayGridOther.map((col, colIdx) => {
        if (colIdx >= 1 && colIdx <= 4) {
          const topSym = topTrackerOther[colIdx - 1] || 'WX';
          return [...col, topSym];
        }
        return col;
      });
    }

    const baseWins = evaluateGrid(finalGrid, currentPaytable, gameType, undefined, true);

    if (activeTab === 'other' && selectedSymbol) {
      const hasTargetWin = baseWins.some(w => w.symbolId === selectedSymbol);

      if (!hasTargetWin) {
        let wildSymbol = "WILD";
        for (const strip of currentStrips) {
          if (!strip) continue;
          for (const sym of strip) {
            if (sym === "WILD" || sym === "W" || sym === "WX") {
              wildSymbol = sym;
              break;
            }
          }
        }

        const matchCountsByCol = finalGrid.map(col =>
          col.filter(s => s === selectedSymbol || s === wildSymbol).length
        );

        let matchLength = 0;
        for (let c = 0; c < reelCount; c++) {
          if (matchCountsByCol[c] > 0) {
            matchLength++;
          } else {
            break;
          }
        }

        if (matchLength >= 2) {
          let ways = 1;
          for (let c = 0; c < matchLength; c++) {
            if (gameType === 'megaway') {
              ways *= 1;
            } else {
              ways *= matchCountsByCol[c];
            }
          }

          baseWins.push({
            symbolId: selectedSymbol,
            matchCount: matchLength,
            ways: ways,
            payout: 0,
            totalWin: 0
          });
        }
      }
    }

    return baseWins;
  }, [displayGridOther, currentPaytable, activeTab, selectedSymbol, currentStrips, reelCount, gameType, topTrackerOther]);

  // 計算兩個 Tab 中，哪些座標參與了中獎
  const winningCoords = useMemo(() =>
    getWinningPositions(displayGrid, wins, currentPaytable, gameType, gameType === 'megaway' ? topTracker : undefined),
    [displayGrid, wins, currentPaytable, gameType, topTracker]
  );

  const winningCoordsOther = useMemo(() =>
    getWinningPositions(displayGridOther, winsOther, currentPaytable, gameType, gameType === 'megaway' ? topTrackerOther : undefined),
    [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther]
  );

  // 繪製與更新 SVG 連線路徑
  const updatePaths = () => {
    if (activeTab === 'manual') {
      const p = calculateSVGPaths(displayGrid, wins, currentPaytable, gridContainerRef.current, false, gameType, gameType === 'megaway' ? topTracker : undefined);
      setLinePaths(p);
    } else {
      const p = calculateSVGPaths(displayGridOther, winsOther, currentPaytable, gridContainerRefOther.current, true, gameType, gameType === 'megaway' ? topTrackerOther : undefined);
      setLinePathsOther(p);
    }
  };

  useEffect(() => {
    const timer = setTimeout(updatePaths, 150);
    return () => clearTimeout(timer);
  }, [displayGrid, wins, displayGridOther, winsOther, activeTab, reelCount, rowCounts, gameType, topTracker, topTrackerOther]);

  useEffect(() => {
    window.addEventListener('resize', updatePaths);
    return () => window.removeEventListener('resize', updatePaths);
  }, [displayGrid, wins, displayGridOther, winsOther, activeTab, gameType, topTracker, topTrackerOther]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative">
      <style>{`
        @keyframes lineFlow {
          to {
            stroke-dashoffset: -32;
          }
        }
        .winning-line-flow {
          stroke-dasharray: 14 6;
          animation: lineFlow 1.1s linear infinite;
        }
      `}</style>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-800 bg-[#0f1d35] rounded-t-xl overflow-hidden shrink-0 border border-gray-700/50">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'manual'
              ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
              : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
            }`}
        >
          手動計算盤面
        </button>
        <button
          onClick={() => setActiveTab('other')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'other'
              ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
              : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
            }`}
        >
          連線測試產生器
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#112240]/10 border-x border-b border-gray-700/30 rounded-b-xl overflow-y-auto p-6 flex flex-col">
        {activeTab === 'manual' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">

            {/* Controls */}
            <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-3 rounded-lg border border-gray-700/50 shadow-inner gap-3">
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-dashboard-text-secondary font-bold pl-2">Reel Settings</span>
                  <input
                    type="text"
                    placeholder="貼上 RNG 數組..."
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const parsed = parsePasteRng(val, reelCount);
                        if (parsed) setManualIndices(parsed);
                        e.target.value = '';
                      }
                    }}
                    className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-0.5 outline-none focus:border-yellow-500 text-[10px] w-36 placeholder:text-gray-600 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30">
                  <span className="text-[10px] text-gray-400 font-bold">RNG:</span>
                  <code className="text-[10px] text-yellow-400 font-mono">
                    [{manualIndices.map(i => i === '' ? '0' : i).join(',')}],
                  </code>
                  <button
                    onClick={() => {
                      const text = `[${manualIndices.map(i => i === '' ? '0' : i).join(',')}],`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-[9px] font-bold bg-[#0a192f] text-dashboard-accent border border-dashboard-accent/50 px-2 py-0.5 rounded hover:bg-dashboard-accent hover:text-[#0a192f] transition-colors ml-1 cursor-pointer"
                  >
                    COPY
                  </button>
                </div>
              </div>
              <div className="flex flex-nowrap justify-center gap-1.5 w-full">
                {rowCounts.slice(0, reelCount).map((rows, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 p-2 bg-[#112240] rounded-md border border-gray-700/50 shadow-sm hover:border-gray-600 transition-colors flex-1 min-w-[60px] max-w-[100px]">
                    <span className="text-[10px] text-dashboard-accent font-mono font-bold mb-0.5">R{idx + 1}</span>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[9px] text-gray-400 shrink-0">Rows</span>
                        <select
                          value={rows}
                          onChange={(e) => {
                            const newCounts = [...rowCounts];
                            newCounts[idx] = Number(e.target.value);
                            onRowCountsChange(newCounts);
                          }}
                          disabled={isRunning}
                          className="bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-0.5 py-0.5 outline-none focus:border-dashboard-accent text-[10px] cursor-pointer appearance-none text-center w-full max-w-[40px]"
                        >
                          {[2, 3, 4, 5, 6, 7, 8].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[9px] text-gray-400 shrink-0">Line</span>
                        <input
                          type="text"
                          placeholder="-"
                          value={manualIndices[idx]}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ''); // Only allow digits
                            const newIndices = [...manualIndices];
                            newIndices[idx] = val;
                            setManualIndices(newIndices);
                          }}
                          disabled={isRunning}
                          className="w-full max-w-[40px] bg-[#0a192f] border border-gray-600 text-yellow-400 rounded px-0.5 py-0.5 outline-none focus:border-yellow-500 text-[10px] text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot Grid Visualization */}
            <div
              ref={gridContainerRef}
              className="bg-dashboard-card p-6 rounded-xl shadow-2xl border border-gray-700/30 w-full max-w-3xl overflow-hidden relative"
            >
              {/* SVG Winning Line Overlay */}
              {linePaths.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
                  <defs>
                    <filter id="glow-manual" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {linePaths.map((p, idx) => (
                    <g key={idx}>
                      <path
                        d={p}
                        fill="none"
                        stroke="#64ffda"
                        strokeWidth="8"
                        strokeOpacity="0.45"
                        filter="url(#glow-manual)"
                      />
                      <path
                        d={p}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="winning-line-flow"
                      />
                    </g>
                  ))}
                </svg>
              )}

              <div className="flex flex-col items-center justify-center gap-3 relative z-10 w-full">
                {/* Megaways Top Tracker */}
                {gameType === 'megaway' && (
                  <div className="flex gap-3 justify-center mb-1">
                    <div className="w-20 h-20 bg-transparent" />
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const isWinning = winningCoords.has(`top-${idx}`);
                      const hasAnyWin = winningCoords.size > 0;
                      return (
                        <div
                          key={idx}
                          id={`cell-top-manual-${idx}`}
                          className={`
                            w-20 h-20 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform transition-all duration-300 relative border
                            ${topTracker[idx] === 'WILD' || topTracker[idx].startsWith('W') || topTracker[idx] === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border-yellow-300' : 'bg-[#112240] text-dashboard-text-primary border-dashboard-accent/30'}
                            ${isWinning ? 'scale-[1.06] border-2 border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b]' : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : ''}
                          `}
                        >
                          <span className="text-[9px] text-gray-500 font-mono tracking-tighter absolute top-1">TOP R{idx + 2}</span>
                          <input
                            type="text"
                            value={topTracker[idx]}
                            onChange={(e) => {
                              const newTracker = [...topTracker];
                              newTracker[idx] = e.target.value.toUpperCase();
                              setTopTracker(newTracker);
                            }}
                            className="w-full text-center bg-transparent border-none outline-none text-base font-bold text-white uppercase focus:text-dashboard-accent"
                          />
                        </div>
                      );
                    })}
                    {reelCount > 5 && <div className="w-20 h-20 bg-transparent" />}
                  </div>
                )}

                <div className="flex justify-center items-center gap-3 min-h-[300px]">
                  {displayGrid.map((col, colIndex) => (
                    <div
                      key={colIndex}
                      className="flex flex-col gap-3"
                    >
                      {col.map((symbol, rowIndex) => {
                        const isWinning = winningCoords.has(`${colIndex}-${rowIndex}`);
                        const hasAnyWin = winningCoords.size > 0;
                        return (
                          <div
                            key={`${colIndex}-${rowIndex}`}
                            id={`cell-manual-${colIndex}-${rowIndex}`}
                            className={`
                              w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                              shadow-lg transform transition-all duration-300 relative
                              ${symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                                symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                                  symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                    'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                              ${isWinning
                                ? 'scale-[1.06] border-2 border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b]'
                                : hasAnyWin
                                  ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]'
                                  : ''}
                            `}
                          >
                            {symbol}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evaluation Output */}
            <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 shadow-inner">
              <span className="text-sm text-dashboard-text-secondary font-bold border-b border-gray-700/50 pb-2 mb-3">連線結果 (Evaluation)</span>
              {wins.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {wins.map((w, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#112240] px-4 py-2 rounded border border-gray-700/30">
                      <span className="text-sm text-yellow-400 font-mono font-bold">
                        {w.symbolId} {gameType === 'payanywhere' ? `出現 ${w.matchCount} 個` : gameType === 'linegame' ? `線 ${w.lineIndex! + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`}
                      </span>
                      <span className="text-sm text-gray-300 font-mono">
                        {coin} * {w.payout}{w.ways > 1 ? ` * ${w.ways}` : ''} = <span className="font-bold text-dashboard-accent text-base ml-1">{w.totalWin * coin}</span>
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between items-center px-1">
                    <span className="text-white font-bold text-sm">Total Win</span>
                    <span className="text-dashboard-accent font-bold text-xl">{wins.reduce((sum, w) => sum + w.totalWin, 0) * coin}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <span className="text-sm text-gray-500 italic">沒有連線</span>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'other' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">

            {/* Symbol Selector */}
            <div className="flex items-center justify-between bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 w-full max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-dashboard-text-secondary">選擇目標 Symbol:</span>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-[#112240] border border-gray-600 text-dashboard-text-primary rounded px-3 py-1.5 outline-none focus:border-dashboard-accent text-sm cursor-pointer font-bold"
                >
                  {groupedSymbols.map(group => (
                    <optgroup key={group.id} label={group.title} className="bg-[#0a192f] text-dashboard-accent font-bold text-xs">
                      {group.list.map(sym => (
                        <option key={sym} value={sym} className="bg-[#112240] text-dashboard-text-primary font-normal text-sm">
                          {sym}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <span className="text-xs text-dashboard-text-secondary">
                自動列出該符號在當前滾輪表之無干擾單一連線配置
              </span>
            </div>

            {/* Combination Generator Button Area */}
            <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 shadow-inner">
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-2 mb-3">
                <span className="text-sm text-dashboard-text-secondary font-bold pl-1">
                  連線組合清單 (點擊自動套用 RNG 盤面)
                </span>
                {isSearching && (
                  <span className="text-xs text-yellow-400 font-mono animate-pulse">搜尋可能配置中...</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {combinations.map((comb, idx) => (
                  <button
                    key={idx}
                    disabled={!comb.rng || isSearching}
                    onClick={() => {
                      if (comb.rng) {
                        setManualIndicesOther(comb.rng.map(val => String(val)));
                      }
                    }}
                    className={`flex justify-between items-center px-4 py-2.5 rounded border text-left transition-all ${comb.rng
                        ? comb.isInterfered
                          ? 'bg-[#112240] border-orange-500/40 hover:border-orange-500 text-dashboard-text-primary cursor-pointer'
                          : 'bg-[#112240] border-gray-700/50 hover:border-dashboard-accent hover:bg-[#112240]/80 text-dashboard-text-primary cursor-pointer'
                        : 'bg-[#112240]/10 border-gray-800/50 text-gray-600 cursor-not-allowed'
                      }`}
                  >
                    <span className="text-xs font-bold">{comb.name}</span>
                    {comb.rng ? (
                      <span className={`text-[10px] font-mono border bg-[#0a192f] px-1.5 py-0.5 rounded ${comb.isInterfered
                          ? 'text-orange-400 border-orange-500/30'
                          : 'text-[#64ffda] border-[#64ffda]/30'
                        }`}>
                        RNG: [{comb.rng.join(',')}] {comb.isInterfered ? '(有干擾)' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 italic">無可行滾輪位置</span>
                    )}
                  </button>
                ))}
                {combinations.length === 0 && !isSearching && (
                  <div className="col-span-2 py-4 text-center text-xs text-gray-500 italic">
                    沒有可用的 Symbol，請確認是否載入滾輪表 (Reel Strips)
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-3 rounded-lg border border-gray-700/50 shadow-inner gap-3">
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-dashboard-text-secondary font-bold pl-2">Reel Settings (單一連線測試)</span>
                  <input
                    type="text"
                    placeholder="貼上 RNG 數組..."
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const parsed = parsePasteRng(val, reelCount);
                        if (parsed) setManualIndicesOther(parsed);
                        e.target.value = '';
                      }
                    }}
                    className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-0.5 outline-none focus:border-yellow-500 text-[10px] w-36 placeholder:text-gray-600 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30">
                  <span className="text-[10px] text-gray-400 font-bold">RNG:</span>
                  <code className="text-[10px] text-yellow-400 font-mono">
                    [{manualIndicesOther.map(i => i === '' ? '0' : i).join(',')}],
                  </code>
                  <button
                    onClick={() => {
                      const text = `[${manualIndicesOther.map(i => i === '' ? '0' : i).join(',')}],`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-[9px] font-bold bg-[#0a192f] text-dashboard-accent border border-dashboard-accent/50 px-2 py-0.5 rounded hover:bg-dashboard-accent hover:text-[#0a192f] transition-colors ml-1 cursor-pointer"
                  >
                    COPY
                  </button>
                </div>
              </div>
              <div className="flex flex-nowrap justify-center gap-1.5 w-full">
                {rowCounts.slice(0, reelCount).map((rows, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 p-2 bg-[#112240] rounded-md border border-gray-700/50 shadow-sm hover:border-gray-600 transition-colors flex-1 min-w-[60px] max-w-[100px]">
                    <span className="text-[10px] text-dashboard-accent font-mono font-bold mb-0.5">R{idx + 1}</span>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[9px] text-gray-400 shrink-0">Rows</span>
                        <select
                          value={rows}
                          onChange={(e) => {
                            const newCounts = [...rowCounts];
                            newCounts[idx] = Number(e.target.value);
                            onRowCountsChange(newCounts);
                          }}
                          disabled={isRunning}
                          className="bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-0.5 py-0.5 outline-none focus:border-dashboard-accent text-[10px] cursor-pointer appearance-none text-center w-full max-w-[40px]"
                        >
                          {[2, 3, 4, 5, 6, 7, 8].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[9px] text-gray-400 shrink-0">Line</span>
                        <input
                          type="text"
                          placeholder="-"
                          value={manualIndicesOther[idx]}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ''); // Only allow digits
                            const newIndices = [...manualIndicesOther];
                            newIndices[idx] = val;
                            setManualIndicesOther(newIndices);
                          }}
                          disabled={isRunning}
                          className="w-full max-w-[40px] bg-[#0a192f] border border-gray-600 text-yellow-400 rounded px-0.5 py-0.5 outline-none focus:border-yellow-500 text-[10px] text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot Grid Visualization */}
            <div
              ref={gridContainerRefOther}
              className="bg-dashboard-card p-6 rounded-xl shadow-2xl border border-gray-700/30 w-full max-w-3xl overflow-hidden relative"
            >
              {/* SVG Winning Line Overlay */}
              {linePathsOther.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
                  <defs>
                    <filter id="glow-other" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {linePathsOther.map((p, idx) => (
                    <g key={idx}>
                      <path
                        d={p}
                        fill="none"
                        stroke="#64ffda"
                        strokeWidth="8"
                        strokeOpacity="0.45"
                        filter="url(#glow-other)"
                      />
                      <path
                        d={p}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="winning-line-flow"
                      />
                    </g>
                  ))}
                </svg>
              )}

              <div className="flex flex-col items-center justify-center gap-3 relative z-10 w-full">
                {/* Megaways Top Tracker */}
                {gameType === 'megaway' && (
                  <div className="flex gap-3 justify-center mb-1">
                    <div className="w-20 h-20 bg-transparent" />
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const isWinning = winningCoordsOther.has(`top-${idx}`);
                      const hasAnyWin = winningCoordsOther.size > 0;
                      return (
                        <div
                          key={idx}
                          id={`cell-top-other-${idx}`}
                          className={`
                            w-20 h-20 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform transition-all duration-300 relative border
                            ${topTrackerOther[idx] === 'WILD' || topTrackerOther[idx].startsWith('W') || topTrackerOther[idx] === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border-yellow-300' : 'bg-[#112240] text-dashboard-text-primary border-dashboard-accent/30'}
                            ${isWinning ? 'scale-[1.06] border-2 border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b]' : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : ''}
                          `}
                        >
                          <span className="text-[9px] text-gray-500 font-mono tracking-tighter absolute top-1">TOP R{idx + 2}</span>
                          <input
                            type="text"
                            value={topTrackerOther[idx]}
                            onChange={(e) => {
                              const newTracker = [...topTrackerOther];
                              newTracker[idx] = e.target.value.toUpperCase();
                              setTopTrackerOther(newTracker);
                            }}
                            className="w-full text-center bg-transparent border-none outline-none text-base font-bold text-white uppercase focus:text-dashboard-accent"
                          />
                        </div>
                      );
                    })}
                    {reelCount > 5 && <div className="w-20 h-20 bg-transparent" />}
                  </div>
                )}

                <div className="flex justify-center items-center gap-3 min-h-[300px]">
                  {displayGridOther.map((col, colIndex) => (
                    <div
                      key={colIndex}
                      className="flex flex-col gap-3"
                    >
                      {col.map((symbol, rowIndex) => {
                        const isWinning = winningCoordsOther.has(`${colIndex}-${rowIndex}`);
                        const hasAnyWin = winningCoordsOther.size > 0;
                        return (
                          <div
                            key={`${colIndex}-${rowIndex}`}
                            id={`cell-other-${colIndex}-${rowIndex}`}
                            className={`
                              w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                              shadow-lg transform transition-all duration-300 relative
                              ${symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                                symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                                  symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                    'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                              ${isWinning
                                ? 'scale-[1.06] border-2 border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b]'
                                : hasAnyWin
                                  ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]'
                                  : ''}
                            `}
                          >
                            {symbol}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evaluation Output */}
            <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 shadow-inner">
              <span className="text-sm text-dashboard-text-secondary font-bold border-b border-gray-700/50 pb-2 mb-3">連線結果 (Evaluation)</span>
              {winsOther.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {winsOther.map((w, idx) => {
                    const isInterference = w.symbolId !== selectedSymbol;
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center px-4 py-2 rounded border transition-all ${isInterference
                            ? 'bg-red-950/20 border-red-500/40 text-red-400 animate-pulse'
                            : 'bg-[#112240] border-gray-700/30 text-gray-300'
                          }`}
                      >
                        <span className={`text-sm font-mono font-bold ${isInterference ? 'text-red-500' : 'text-yellow-400'}`}>
                          {w.symbolId} {gameType === 'payanywhere' ? `出現 ${w.matchCount} 個` : gameType === 'linegame' ? `線 ${w.lineIndex! + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`} {isInterference ? ' (干擾連線)' : ''}
                        </span>
                        <span className="text-sm font-mono">
                          {coin} * {w.payout}{w.ways > 1 ? ` * ${w.ways}` : ''} = <span className={`font-bold text-base ml-1 ${isInterference ? 'text-red-400' : 'text-dashboard-accent'}`}>{w.totalWin * coin}</span>
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between items-center px-1">
                    <span className="text-white font-bold text-sm">Total Win</span>
                    <span className="text-dashboard-accent font-bold text-xl">
                      {winsOther.reduce((sum, w) => sum + w.totalWin, 0) * coin}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <span className="text-sm text-gray-500 italic">沒有連線</span>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
