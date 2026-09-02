import React, { useState, useMemo, useEffect } from 'react';
import { evaluateGrid } from '../../utils/evaluation';
import { formatAmount } from '../../utils/formatters';
import { getWinColorClass } from '../../utils/svgPaths';
import { getWinningPositions } from '../../utils/evaluation';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';
import { GameRegistry } from '../../core/GameRegistry';
import type { GameType, PaytableRule } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { SpecialSymbols } from '../../constants/GameConstants';

const ALL_SPECIAL_BALLS = [...MULTIPLIER_BALLS, ...LUCKY_BALLS];
const MULTIPLIER_LEVELS = [2, 3, 4, 6, 8, 10, 12, 15, 18, 25, 55, 65, 80, 100, 150, 200, 250, 500];

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
  const isFreeGame = useGameStore(state => state.isFreeGame);
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
  const [luckySelectsStr, setLuckySelectsStr] = useState<string>('');
  const [selectionStr, setSelectionStr] = useState<string>('');
  
  // 內部維護的狀態：
  const [mathIdSequence, setMathIdSequence] = useState<number[]>([]); // 剩餘的所有 MathID
  const [remainingClassIds, setRemainingClassIds] = useState<number[]>([]); // 剩餘的 Class IDs
  const [remainingLuckySelects, setRemainingLuckySelects] = useState<number[]>([]); // 剩餘的 LuckySelects
  const [currentGridIds, setCurrentGridIds] = useState<string[][]>([]); // 目前盤面的 MathID 陣列 (包含倍數如 "15_2X")
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [accumulatedWin, setAccumulatedWin] = useState<number>(0);
  const [tumbleCount, setTumbleCount] = useState<number>(0);

  // 載入初始盤面
  const handleLoadInitialGrid = () => {
    const ids = inputArrayStr.replace(/[^0-9, \t\n]/g, ',')
                           .split(/[,\s]+/)
                           .map(s => parseInt(s.trim()))
                           .filter(n => !isNaN(n));

    const cIds = classIdsStr.replace(/[^0-9, \t\n]/g, ',')
                           .split(/[,\s]+/)
                           .map(s => parseInt(s.trim()))
                           .filter(n => !isNaN(n));
    
    const lSelects = luckySelectsStr.replace(/[^0-9, \t\n]/g, ',')
                                   .split(/[,\s]+/)
                                   .map(s => parseInt(s.trim()))
                                   .filter(n => !isNaN(n));

    if (ids.length < totalCells) {
      setToastMessage(`請至少輸入 ${totalCells} 個數字來填滿盤面！目前只有 ${ids.length} 個。`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    let classPtr = 0;

    // 取出前 totalCells 個作為初始盤面
    const gridIds: string[][] = [];
    let ptr = 0;
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const colIds = [];
      for (let r = 0; r < rows; r++) {
        let idVal = ids[ptr++];
        let symStr = String(idVal);
        const mappedSym = reverseMap[idVal];
        if (mappedSym && mappedSym.match(/^[F|L][1-4]/)) {
          const mult = cIds[classPtr++];
          if (mult) symStr = `${idVal}_${mult}X`;
        }
        colIds.push(symStr);
      }
      gridIds.push(colIds);
    }

    setCurrentGridIds(gridIds);
    // 剩下的存入遞補序列
    setMathIdSequence(ids.slice(totalCells));
    setRemainingClassIds(cIds.slice(classPtr));
    setRemainingLuckySelects(lSelects);
    setAccumulatedWin(0);
    setTumbleCount(0);
  };

  // 把 MathID Grid 轉換為 Symbol Grid
  const currentGridSymbols = useMemo(() => {
    return currentGridIds.map(col => col.map(strId => {
      if (strId === 'WX') return 'WX';
      if (typeof strId === 'string' && strId.includes('_')) {
        const [baseId, mult] = strId.split('_');
        const sym = reverseMap[parseInt(baseId)] || `?${baseId}`;
        return `${sym.split('_')[0]}_${mult}`;
      }
      return reverseMap[parseInt(String(strId))] || `?${strId}`;
    }));
  }, [currentGridIds, reverseMap]);

  // 當前盤面的贏分結果
  const { wins, winningCoords, totalWin, currentMultiplier } = useMemo(() => {
    if (currentGridSymbols.length === 0) return { wins: [], winningCoords: new Map<string, number[]>(), totalWin: 0, currentMultiplier: 1 };
    const evWins = evaluateGrid(currentGridSymbols, currentPaytable, gameType, undefined, false);
    const coords = getWinningPositions(currentGridSymbols, evWins, currentPaytable, gameType);
    
    const gameInstance = GameRegistry.getGame(gameType);
    let mult = gameInstance.getTumbleMultiplier(tumbleCount, isFreeGame);
    
    const winSum = evWins.reduce((sum, w) => sum + (w.totalWin * mult), 0);
    return { wins: evWins, winningCoords: coords, totalWin: winSum, currentMultiplier: mult };
  }, [currentGridSymbols, currentPaytable, gameType, tumbleCount, isFreeGame]);

  const [pulseToggle, setPulseToggle] = useState(false);
  
  const coordsString = useMemo(() => Array.from(winningCoords.keys()).sort().join(','), [winningCoords]);
  useEffect(() => {
    setPulseToggle(p => !p);
  }, [coordsString]);
  const pulseClass = pulseToggle ? 'animate-sync-pulse-1' : 'animate-sync-pulse-2';

  const handleTumble = () => {
    if (wins.length === 0) return;

    setAccumulatedWin(prev => prev + totalWin);
    setTumbleCount(prev => prev + 1);

    let newSequence = [...mathIdSequence];
    let newClassSeq = [...remainingClassIds];
    let newLuckySelects = [...remainingLuckySelects];
    let sequenceDepleted = false;

    // 預處理 L 符號升級 (僅對未被消除的符號進行升級)
    const upgradeCount = newLuckySelects.length > 0 ? newLuckySelects.shift()! : 0;
    const upgradedGridSymbols = currentGridSymbols.map((col, c) => col.map((symId, r) => {
      if (!winningCoords.has(`${c}-${r}`) && upgradeCount > 0 && symId.startsWith('L') && symId.includes('_')) {
        let val = parseInt(symId.split('_')[1].replace('X', ''), 10);
        let currentIndex = MULTIPLIER_LEVELS.indexOf(val);
        if (currentIndex === -1) currentIndex = MULTIPLIER_LEVELS.indexOf(2);
        const nextIndex = Math.min(MULTIPLIER_LEVELS.length - 1, currentIndex + upgradeCount);
        val = MULTIPLIER_LEVELS[nextIndex];
        return `${symId.split('_')[0]}_${val}X`;
      }
      return symId;
    }));

    const gameInstance = GameRegistry.getGame(gameType);
    const nextGrid = gameInstance.calculateNextDropGrid(
      upgradedGridSymbols,
      winningCoords,
      isFreeGame,
      (c, dropIndex, totalDropped) => {
        if (newSequence.length > 0) {
          let idVal = newSequence.shift()!;
          let symStr = String(idVal);
          const mappedSym = reverseMap[idVal];
          if (mappedSym && mappedSym.match(/^[F|L][1-4]/)) {
            const mult = newClassSeq.shift();
            if (mult) symStr = `${idVal}_${mult}X`;
          }
          return symStr;
        } else {
          return "0";
        }
      }
    );

    if (sequenceDepleted) {
      setToastMessage("補位陣列用盡！已補入 0 (未知符號)。請準備更長的輸入陣列。");
      setTimeout(() => setToastMessage(null), 3000);
    }

    setCurrentGridIds(nextGrid);
    setMathIdSequence(newSequence);
    setRemainingClassIds(newClassSeq);
    setRemainingLuckySelects(newLuckySelects);
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
            
            <div className="flex gap-2 shrink-0 mt-2">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold flex justify-between">
                  <span>輸入ClassIDs</span>
                  <span className="text-gray-500 font-normal">剩餘: {remainingClassIds.length}</span>
                </span>
                <textarea
                  value={classIdsStr}
                  onChange={(e) => setClassIdsStr(e.target.value)}
                  placeholder="2, 2, 3, 3..."
                  className="w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-purple-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold flex justify-between">
                  <span>輸入LuckySelects</span>
                  <span className="text-gray-500 font-normal">剩餘: {remainingLuckySelects.length}</span>
                </span>
                <textarea
                  value={luckySelectsStr}
                  onChange={(e) => setLuckySelectsStr(e.target.value)}
                  placeholder="1, 1, 5..."
                  className="w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-pink-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold">輸入Selection</span>
                <textarea
                  value={selectionStr}
                  onChange={(e) => setSelectionStr(e.target.value)}
                  placeholder="Selection..."
                  className="w-full bg-[#112240] border border-gray-700 rounded p-2 text-xs text-gray-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
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

      {/* 下半部：盤面與控制 */}
      <div className="flex-1 flex flex-col gap-4 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 overflow-hidden relative">
        <div className="flex justify-between items-start shrink-0 relative z-50">
          <div className="flex items-start gap-4 text-sm text-gray-400">
            <span className="pt-0.5">消除次數: <span className="text-white font-bold">{tumbleCount}</span></span>
            {(gameType === 'waygame' || gameType === 'waygame_elephant') && <span className="pt-0.5">目前倍數: <span className="text-purple-400 font-bold">x{currentMultiplier}</span></span>}
            <span className="pt-0.5">單次贏分: <span className="text-yellow-400 font-bold">{formatAmount(totalWin * betMultiplier)}</span></span>
            {(() => {
              let gridMultiplier = 0;
              currentGridSymbols.forEach(col => col.forEach(sym => {
                if (sym.includes('_') && (sym.startsWith('F') || sym.startsWith('L'))) {
                  const valStr = sym.split('_')[1];
                  if (valStr && valStr.endsWith('X')) {
                    let val = parseInt(valStr.replace('X', ''), 10);
                    const ball = ALL_SPECIAL_BALLS.find(b => b.values.includes(val) && b.id.charAt(0) === sym.charAt(0));
                    if (!ball) val = 2; // Invalid fallback to 2X
                    gridMultiplier += val;
                  }
                }
              }));
              const baseWin = accumulatedWin + totalWin;
              const finalWin = baseWin * Math.max(1, gridMultiplier) * betMultiplier;
              const isEnd = wins.length === 0;
              return (
                <div className="flex flex-col gap-2 items-start">
                  <span className="flex items-center gap-2 mt-0.5 relative z-50">
                    <span>目前累積贏分: <span className="text-white font-bold">{formatAmount(baseWin * betMultiplier)}</span></span>
                    {gridMultiplier > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#0a192f] border border-[#64ffda] text-[#64ffda]">
                        盤面倍數: {gridMultiplier}X
                      </span>
                    )}
                    {isEnd && gridMultiplier > 0 && baseWin > 0 && (
                      <div className="absolute top-full left-0 mt-3 bg-[#0f1d35] border border-[#64ffda]/50 rounded-lg p-3 shadow-[0_0_20px_rgba(100,255,218,0.2)] flex flex-col items-end w-[220px] animate-fade-in-up">
                        <span className="text-xs text-gray-400 font-bold mb-0.5">Base Win</span>
                        <span className="text-white font-bold text-sm mb-1">{formatAmount(baseWin * betMultiplier)}</span>
                        <span className="text-xs text-gray-400 font-bold mb-0.5">Total Multiplier</span>
                        <span className="text-[#64ffda] font-bold text-sm mb-1">x{gridMultiplier}</span>
                        <div className="w-full h-px bg-gray-700/50 my-1"></div>
                        <span className="text-xs text-dashboard-accent font-bold mb-0.5">Total Win</span>
                        <span className="text-dashboard-accent font-black text-lg drop-shadow-[0_0_8px_rgba(100,255,218,0.5)]">{formatAmount(finalWin)}</span>
                      </div>
                    )}
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col items-end relative">
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
        </div>

        <div className="flex-1 flex justify-center items-center overflow-auto mt-2">
          {currentGridSymbols.length > 0 ? (
            <div className="flex gap-2 p-6 bg-[#0f1d35] rounded-xl border border-gray-700/50 relative shadow-xl">
              {currentGridSymbols.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col justify-end gap-2">
                  {col.map((sym, rIdx) => {
                    const winIndices = winningCoords.get(`${cIdx}-${rIdx}`);
                    const isWin = !!winIndices;
                    const winColorClass = isWin ? getWinColorClass(winIndices) : '';
                    const isWild = sym === 'WILD' || sym === 'W' || sym === 'WX';
                    const isUnknown = sym.startsWith('?');
                    
                    let customBg = '';
                    let displaySymbol = sym;
                    if (sym.includes('_') && (sym.startsWith('F') || sym.startsWith('L'))) {
                      const [ballId, valStr] = sym.split('_');
                      displaySymbol = valStr;
                      if (valStr && valStr.endsWith('X')) {
                        const numVal = parseInt(valStr.replace('X', ''), 10);
                        const ball = ALL_SPECIAL_BALLS.find(b => b.values.includes(numVal) && b.id.charAt(0) === ballId.charAt(0));
                        if (ball) {
                          customBg = `bg-[#0a192f] border ${ball.border} ${ball.color}`;
                        } else {
                          // Invalid! Force to 2X and use red border
                          displaySymbol = '2X';
                          customBg = `bg-red-900/30 border-2 border-red-500 text-red-500`;
                        }
                      }
                    }
                    
                    const hasAnyWin = winningCoords.size > 0;
                    
                    return (
                      <div
                        key={`${cIdx}-${rIdx}`}
                        className={`w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg relative transform text-sm sm:text-base font-bold
                          ${!isWin && 'transition-all duration-300'} ${
                          isWin
                            ? `z-10 ring-2 scale-105 ${winColorClass} ${pulseClass}`
                            : customBg ? customBg
                            : isWild
                            ? 'bg-[#112240] text-purple-400 border border-purple-500/30'
                            : isUnknown
                            ? 'bg-red-900/30 text-red-400 border border-red-500/50'
                            : 'bg-[#112240] text-gray-300 border border-gray-700/50'
                        } ${!isWin && hasAnyWin && !customBg ? 'opacity-30 scale-95 border-transparent' : ''}`}
                      >
                        <span>{displaySymbol}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-1">
                          ID:{(() => {
                            const rawId = String(currentGridIds[cIdx][rIdx]);
                            if (sym.includes('_') && sym.match(/^[F|L][1-4]_/)) {
                              if (sym.startsWith('F')) return '15';
                              if (sym.startsWith('L')) return '19';
                            }
                            return rawId;
                          })()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 text-sm">請先在上方輸入 RNGs 並載入盤面</span>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-red-900/90 border border-red-500/50 text-red-100 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="text-xl">⚠️</span>
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
