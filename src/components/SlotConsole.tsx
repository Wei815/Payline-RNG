import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PaytableRule, GameType } from '../types';
import { evaluateGrid, defaultPaylines } from '../utils/evaluation';

export interface SlotConsoleProps {
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
  bet: number;
  gameType: GameType;
  customPaylines?: number[][];
}

import {
  parsePasteRng,
  calculateSVGPaths,
  getWinningPositions
} from '../utils/slotUtils';
import type { SVGPathResult } from '../utils/slotUtils';
import { useRngSearch } from '../hooks/useRngSearch';
import { SlotManualTab } from './tabs/SlotManualTab';
import { SlotGeneratorTab } from './tabs/SlotGeneratorTab';
import { LineViewerTab } from './tabs/LineViewerTab';

export const SlotConsole: React.FC<SlotConsoleProps> = ({ isRunning, currentGrid, reelCount, rowCounts, onRowCountsChange, currentStrips, currentPaytable, coin, bet, gameType, customPaylines }) => {
  const betMultiplier = bet / coin;
  const [activeTab, setActiveTab] = useState<'manual' | 'other' | 'lines'>('manual');
  const [lineViewerSymbolState, setLineViewerSymbolState] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [useWxInLines, setUseWxInLines] = useState<boolean>(true);

  const [prevGameType, setPrevGameType] = useState(gameType);
  if (gameType !== prevGameType) {
    setPrevGameType(gameType);
    if (gameType !== 'linegame' && activeTab === 'lines') {
      setActiveTab('manual');
    }
  }

  const [manualIndices, setManualIndices] = useState<string[]>(Array(reelCount).fill(''));
  const [manualIndicesOther, setManualIndicesOther] = useState<string[]>(Array(reelCount).fill(''));
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [topTracker, setTopTracker] = useState<string[]>(Array(4).fill('WX'));
  const [topTrackerOther, setTopTrackerOther] = useState<string[]>(Array(4).fill('WX'));

  const [prevReelCount, setPrevReelCount] = useState(reelCount);
  if (reelCount !== prevReelCount) {
    setPrevReelCount(reelCount);
    setManualIndices(Array(reelCount).fill(''));
    setManualIndicesOther(Array(reelCount).fill(''));
  }

  const { isSearching, combinations } = useRngSearch(
    selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther, customPaylines
  );

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRefOther = useRef<HTMLDivElement>(null);
  const [linePaths, setLinePaths] = useState<SVGPathResult[]>([]);
  const [linePathsOther, setLinePathsOther] = useState<SVGPathResult[]>([]);

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

    const sorted = symList.sort((a, b) => getOrderScore(a) - getOrderScore(b));

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

  const symbols = useMemo(() => {
    const list: string[] = [];
    groupedSymbols.forEach(g => {
      g.list.forEach(sym => list.push(sym));
    });
    return list;
  }, [groupedSymbols]);

  const lineViewerSymbol = useMemo(() => {
    const matchKey = `match${Math.min(5, reelCount)}`;
    const candidate = currentPaytable.find(p => 
      !p.isWild && 
      !p.isScatter && 
      (p.payouts[matchKey as keyof typeof p.payouts] || 0) > 0
    );
    return candidate ? candidate.symbolId : (symbols[0] || 'M1');
  }, [currentPaytable, reelCount, symbols]);

  const activeLineViewerSymbol = lineViewerSymbolState || lineViewerSymbol;

  const [prevSymbols, setPrevSymbols] = useState(symbols);
  if (symbols !== prevSymbols) {
    setPrevSymbols(symbols);
    if (lineViewerSymbolState && !symbols.includes(lineViewerSymbolState)) {
      setLineViewerSymbolState('');
    }
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }

  const lineViewerPayout = useMemo(() => {
    const matchKey = `match${Math.min(5, reelCount)}`;
    const rule = currentPaytable.find(p => p.symbolId === activeLineViewerSymbol);
    return rule ? (rule.payouts[matchKey as keyof typeof rule.payouts] || 0) : 0;
  }, [currentPaytable, reelCount, activeLineViewerSymbol]);

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
      const gridCol = currentGrid[colIndex];
      if (gridCol.length === rowsForThisCol) {
        return gridCol;
      }
      if (gridCol.length < rowsForThisCol) {
        return [...gridCol, ...Array(rowsForThisCol - gridCol.length).fill('-')];
      }
      return gridCol.slice(0, rowsForThisCol);
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
    return evaluateGrid(finalGrid, currentPaytable, gameType, customPaylines);
  }, [displayGrid, currentPaytable, gameType, topTracker, customPaylines]);

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
      const gridCol = currentGrid[colIndex];
      if (gridCol.length === rowsForThisCol) {
        return gridCol;
      }
      if (gridCol.length < rowsForThisCol) {
        return [...gridCol, ...Array(rowsForThisCol - gridCol.length).fill('-')];
      }
      return gridCol.slice(0, rowsForThisCol);
    }

    return Array(rowsForThisCol).fill('-');
  });

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

    const baseWins = evaluateGrid(finalGrid, currentPaytable, gameType, customPaylines, true);

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
            ways *= matchCountsByCol[c];
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
  }, [displayGridOther, currentPaytable, activeTab, selectedSymbol, currentStrips, reelCount, gameType, topTrackerOther, customPaylines]);

  const winningCoords = useMemo(() =>
    getWinningPositions(displayGrid, wins, currentPaytable, gameType, gameType === 'megaway' ? topTracker : undefined, customPaylines),
    [displayGrid, wins, currentPaytable, gameType, topTracker, customPaylines]
  );

  const winningCoordsOther = useMemo(() =>
    getWinningPositions(displayGridOther, winsOther, currentPaytable, gameType, gameType === 'megaway' ? topTrackerOther : undefined, customPaylines),
    [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther, customPaylines]
  );

  const updatePaths = () => {
    if (activeTab === 'manual') {
      const p = calculateSVGPaths(displayGrid, wins, currentPaytable, gridContainerRef.current, false, gameType, gameType === 'megaway' ? topTracker : undefined, customPaylines);
      setLinePaths(p);
    } else {
      const p = calculateSVGPaths(displayGridOther, winsOther, currentPaytable, gridContainerRefOther.current, true, gameType, gameType === 'megaway' ? topTrackerOther : undefined, customPaylines);
      setLinePathsOther(p);
    }
  };

  useEffect(() => {
    const timer = setTimeout(updatePaths, 150);
    return () => clearTimeout(timer);
  }, [displayGrid, wins, displayGridOther, winsOther, activeTab, reelCount, rowCounts, gameType, topTracker, topTrackerOther, customPaylines]);

  useEffect(() => {
    window.addEventListener('resize', updatePaths);
    return () => window.removeEventListener('resize', updatePaths);
  }, [displayGrid, wins, displayGridOther, winsOther, activeTab, gameType, topTracker, topTrackerOther, customPaylines]);

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
        {gameType === 'linegame' && (
          <button
            onClick={() => setActiveTab('lines')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'lines'
                ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
              }`}
          >
            贏分線路一覽
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-[#112240]/10 border-x border-b border-gray-700/30 rounded-b-xl overflow-y-auto custom-scrollbar p-6 flex flex-col">
        {activeTab === 'manual' && (
          <SlotManualTab 
            reelCount={reelCount} rowCounts={rowCounts} onRowCountsChange={onRowCountsChange}
            manualIndices={manualIndices} setManualIndices={setManualIndices}
            topTracker={topTracker} setTopTracker={setTopTracker}
            gameType={gameType} displayGrid={displayGrid}
            winningCoords={winningCoords} wins={wins} betMultiplier={betMultiplier}
            parsePasteRng={parsePasteRng} gridContainerRef={gridContainerRef} linePaths={linePaths}
            isRunning={isRunning} selectedSymbol={selectedSymbol}
          />
        )}
        {activeTab === 'other' && (
          <SlotGeneratorTab 
            reelCount={reelCount} rowCounts={rowCounts} onRowCountsChange={onRowCountsChange}
            manualIndicesOther={manualIndicesOther} setManualIndicesOther={setManualIndicesOther}
            topTrackerOther={topTrackerOther} setTopTrackerOther={setTopTrackerOther}
            gameType={gameType} displayGridOther={displayGridOther}
            winningCoordsOther={winningCoordsOther} winsOther={winsOther} betMultiplier={betMultiplier}
            gridContainerRefOther={gridContainerRefOther} linePathsOther={linePathsOther}
            isSearching={isSearching} combinations={combinations}
            selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol}
            groupedSymbols={groupedSymbols} parsePasteRng={parsePasteRng} isRunning={isRunning}
          />
        )}
        {gameType === 'linegame' && activeTab === 'lines' && (
          <LineViewerTab 
            reelCount={reelCount} rowCounts={rowCounts} currentStrips={currentStrips}
            activeLineViewerSymbol={activeLineViewerSymbol} setLineViewerSymbolState={setLineViewerSymbolState}
            symbols={symbols} useWxInLines={useWxInLines} setUseWxInLines={setUseWxInLines}
            lineViewerPayout={lineViewerPayout} betMultiplier={betMultiplier}
            customPaylines={customPaylines} defaultPaylines={defaultPaylines}
            setManualIndices={setManualIndices} setManualIndicesOther={setManualIndicesOther}
            copiedIndex={copiedIndex} setCopiedIndex={setCopiedIndex}
            currentPaytable={currentPaytable} gameType={gameType}
          />
        )}
      </div>
    </div>
  );
};
