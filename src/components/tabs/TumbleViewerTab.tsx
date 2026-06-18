import React, { useState, useMemo, useEffect } from 'react';
import { evaluateGrid } from '../../utils/evaluation';
import { getWinningPositions, formatAmount } from '../../utils/slotUtils';
import type { GameType, PaytableRule } from '../../types';


export interface TumbleViewerTabProps {
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  currentPaytable: PaytableRule[];
  gameType: GameType;
  manualIndices: string[];
  betMultiplier: number;
}

export const TumbleViewerTab: React.FC<TumbleViewerTabProps> = ({
  reelCount, rowCounts, currentPaytable, gameType, betMultiplier
}) => {
  const totalCells = rowCounts.reduce((acc, curr) => acc + curr, 0);

  // 建立反向查詢表：MathID -> SymbolID
  const reverseMap = useMemo(() => {
    const map: Record<number, string> = {};
    currentPaytable.forEach(rule => {
      const idsStr = String(rule.mathId ?? '');
      if (!idsStr) return;
      const ids = idsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      for (const id of ids) {
        map[id] = rule.symbolId;
      }
    });
    return map;
  }, [currentPaytable]);

  // 2. 模擬輸入陣列
  const [inputArrayStr, setInputArrayStr] = useState<string>('');
  const [classIdsStr, setClassIdsStr] = useState<string>('');
  const [selectionStr, setSelectionStr] = useState<string>('');
  
  // 內部維護的狀態：
  const [mathIdSequence, setMathIdSequence] = useState<number[]>([]); // 剩餘的所有 MathID
  const [currentGridIds, setCurrentGridIds] = useState<number[][]>([]); // 目前盤面的 MathID 陣列
  
  const [accumulatedWin, setAccumulatedWin] = useState<number>(0);
  const [tumbleCount, setTumbleCount] = useState<number>(0);

  // 載入初始盤面
  const handleLoadInitialGrid = () => {
    const ids = inputArrayStr.replace(/[^0-9, \t\n]/g, ',')
                           .split(/[,\s]+/)
                           .map(s => parseInt(s.trim()))
                           .filter(n => !isNaN(n));

    if (ids.length < totalCells) {
      alert(`請至少輸入 ${totalCells} 個數字來填滿盤面！目前只有 ${ids.length} 個。`);
      return;
    }

    // 取出前 totalCells 個作為初始盤面
    const gridIds: number[][] = [];
    let ptr = 0;
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const colIds = [];
      for (let r = 0; r < rows; r++) {
        colIds.push(ids[ptr++]);
      }
      gridIds.push(colIds);
    }

    setCurrentGridIds(gridIds);
    // 剩下的存入遞補序列
    const remainingSeq = ids.slice(totalCells);
    setMathIdSequence(remainingSeq);
    setInputArrayStr(remainingSeq.join(', '));
    setAccumulatedWin(0);
    setTumbleCount(0);
  };

  // 把 MathID Grid 轉換為 Symbol Grid
  const currentGridSymbols = useMemo(() => {
    return currentGridIds.map(col => col.map(id => reverseMap[id] || `?${id}`));
  }, [currentGridIds, reverseMap]);

  // 當前盤面的贏分結果
  const { wins, winningCoords, totalWin } = useMemo(() => {
    if (currentGridSymbols.length === 0) return { wins: [], winningCoords: new Set<string>(), totalWin: 0 };
    const evWins = evaluateGrid(currentGridSymbols, currentPaytable, gameType);
    const coords = getWinningPositions(currentGridSymbols, evWins, currentPaytable, gameType);
    const winSum = evWins.reduce((sum, w) => sum + w.totalWin, 0);
    return { wins: evWins, winningCoords: coords, totalWin: winSum };
  }, [currentGridSymbols, currentPaytable, gameType]);

  const [pulseToggle, setPulseToggle] = useState(false);
  
  const coordsString = useMemo(() => Array.from(winningCoords).sort().join(','), [winningCoords]);
  useEffect(() => {
    setPulseToggle(p => !p);
  }, [coordsString]);
  const pulseClass = pulseToggle ? 'animate-sync-pulse-1' : 'animate-sync-pulse-2';

  const handleTumble = () => {
    if (wins.length === 0) return;

    setAccumulatedWin(prev => prev + totalWin);
    setTumbleCount(prev => prev + 1);

    const newGridIds: number[][] = [];
    let newSequence = [...mathIdSequence];
    let sequenceDepleted = false;

    for (let c = 0; c < reelCount; c++) {
      const rowsForThisCol = rowCounts[c] || 3;
      const keptIds: number[] = [];

      // 收集未被消除的符號
      for (let r = 0; r < rowsForThisCol; r++) {
        if (!winningCoords.has(`${c}-${r}`)) {
          keptIds.push(currentGridIds[c][r]);
        }
      }

      const removedCount = rowsForThisCol - keptIds.length;
      const newSymbols: number[] = [];

      // 從上方(輸入陣列)提取新的符號補齊
      for (let i = 0; i < removedCount; i++) {
        if (newSequence.length > 0) {
          // 模擬從上方掉落，所以從陣列最前面拿取
          newSymbols.push(newSequence.shift()!);
        } else {
          // 若陣列空了，則補上一個未知的預設值 0
          newSymbols.push(0);
          sequenceDepleted = true;
        }
      }

      // 補上的符號在上方，原本留下來的在下方
      newGridIds.push([...newSymbols, ...keptIds]);
    }

    if (sequenceDepleted) {
      alert("補位數字用盡！已補上 0 (未知符號)。請準備更長的輸入陣列。");
    }

    setCurrentGridIds(newGridIds);
    setMathIdSequence(newSequence);
    setInputArrayStr(newSequence.join(', '));
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      
      {/* 上半部：設定與控制區 */}
      <div className="flex gap-4 min-h-[220px] shrink-0">
        
        {/* 右側：輸入區與狀態 */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dashboard-text-secondary font-bold">輸入 RNGs (從上到下、從左到右)</span>
              <span className="text-xs text-gray-500">剩餘可遞補符號數: <span className="text-dashboard-accent font-bold">{mathIdSequence.length}</span></span>
            </div>
            <textarea
              value={inputArrayStr}
              onChange={(e) => setInputArrayStr(e.target.value)}
              placeholder="請貼上一長串數字 (例如 300 個數字)，將自動取前 30 個作為初始盤面，後續的作為消除掉落的補位來源..."
              className="flex-1 w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-yellow-400 font-mono outline-none focus:border-dashboard-accent resize-none min-h-[60px]"
            />
            <div className="flex gap-2 shrink-0">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold">輸入ClassIDs</span>
                <textarea
                  value={classIdsStr}
                  onChange={(e) => setClassIdsStr(e.target.value)}
                  placeholder="Class IDs..."
                  className="w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-yellow-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold">輸入Selection</span>
                <textarea
                  value={selectionStr}
                  onChange={(e) => setSelectionStr(e.target.value)}
                  placeholder="Selection..."
                  className="w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-yellow-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
            </div>
            <button
              onClick={handleLoadInitialGrid}
              className="w-full py-2 bg-[#112240] border border-dashboard-accent text-dashboard-accent hover:bg-dashboard-accent hover:text-[#0a192f] rounded font-bold text-sm transition-all"
            >
              載入初始盤面並重置
            </button>
          </div>
        </div>
      </div>

      {/* 下半部：盤面與控制 */}
      <div className="flex-1 flex flex-col gap-4 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 overflow-hidden relative">
        <div className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>消除次數: <span className="text-white font-bold">{tumbleCount}</span></span>
            <span>本次贏分: <span className="text-yellow-400 font-bold">{formatAmount(totalWin * betMultiplier)}</span></span>
            <span>累積總贏分: <span className="text-dashboard-accent font-bold">{formatAmount((accumulatedWin + totalWin) * betMultiplier)}</span></span>
          </div>
          <button
            onClick={handleTumble}
            disabled={wins.length === 0}
            className={`px-6 py-2 rounded text-sm font-bold transition-all shadow-lg ${
              wins.length > 0
                ? 'bg-[#64ffda] text-[#0a192f] hover:bg-white hover:shadow-[0_0_15px_rgba(100,255,218,0.5)]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {wins.length > 0 ? '執行消除 (Tumble)' : '無可消除連線'}
          </button>
        </div>

        <div className="flex-1 flex justify-center items-center overflow-auto">
          {currentGridSymbols.length > 0 ? (
            <div className="flex gap-2 p-6 bg-[#0f1d35] rounded-xl border border-gray-700/50 relative shadow-xl">
              {currentGridSymbols.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-2">
                  {col.map((sym, rIdx) => {
                    const isWin = winningCoords.has(`${cIdx}-${rIdx}`);
                    const isWild = sym === 'WILD' || sym === 'W' || sym === 'WX';
                    const isUnknown = sym.startsWith('?');
                    
                    return (
                      <div
                        key={`${cIdx}-${rIdx}`}
                        className={`w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg relative transform
                          ${!isWin && 'transition-all duration-300'} ${
                          isWin
                            ? `bg-dashboard-accent text-[#0a192f] scale-105 shadow-[0_0_15px_rgba(100,255,218,0.5)] z-10 ${pulseClass}`
                            : isWild
                            ? 'bg-[#112240] text-purple-400 border border-purple-500/30'
                            : isUnknown
                            ? 'bg-red-900/30 text-red-400 border border-red-500/50'
                            : 'bg-[#112240] text-gray-300 border border-gray-700/50'
                        }`}
                      >
                        <span className="text-sm sm:text-base font-bold">{sym}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-1">ID:{currentGridIds[cIdx][rIdx]}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 text-sm">請先在上方輸入 MathID 陣列並載入盤面</span>
          )}
        </div>
      </div>

    </div>
  );
};
