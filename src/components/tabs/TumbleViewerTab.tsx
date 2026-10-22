import React, { useState, useMemo, useEffect } from 'react';
import { formatAmount } from '../../utils/formatters';
import { getWinColorClass } from '../../utils/svgPaths';
import { MULTIPLIER_BALLS, LUCKY_BALLS, SpecialSymbols } from '../../utils/evaluation/GameConstants';
import type { GameType, PaytableRule } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { getTraits } from '../../games/registry';
import { symbolToneClass } from '../ui/symbolTone';
import { evaluateTumble, gridSymbols, loadInitialGrid, tumbleOnce, type TumbleEnv, type TumbleState } from '../../flows/tumble';

const ALL_SPECIAL_BALLS = [...MULTIPLIER_BALLS, ...LUCKY_BALLS];

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

  // 載入 / 計分 / 掉落邏輯在 src/flows/tumble.ts（有流程規則測試）
  const env: TumbleEnv = useMemo(() => ({ gameType, reelCount, rowCounts, currentPaytable, isFreeGame }), [gameType, reelCount, rowCounts, currentPaytable, isFreeGame]);

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
    const loaded = loadInitialGrid(env, inputArrayStr, classIdsStr, luckySelectsStr);
    if ('error' in loaded) {
      setToastMessage(loaded.error);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    applyState(loaded);
  };

  const tumbleState: TumbleState = useMemo(() => ({
    currentGridIds, mathIdSequence, remainingClassIds, remainingLuckySelects, accumulatedWin, tumbleCount,
  }), [currentGridIds, mathIdSequence, remainingClassIds, remainingLuckySelects, accumulatedWin, tumbleCount]);

  const applyState = (next: TumbleState) => {
    setCurrentGridIds(next.currentGridIds);
    setMathIdSequence(next.mathIdSequence);
    setRemainingClassIds(next.remainingClassIds);
    setRemainingLuckySelects(next.remainingLuckySelects);
    setAccumulatedWin(next.accumulatedWin);
    setTumbleCount(next.tumbleCount);
  };

  // 把 MathID Grid 轉換為 Symbol Grid
  const currentGridSymbols = useMemo(() => gridSymbols(env, currentGridIds), [env, currentGridIds]);

  // 當前盤面的贏分結果
  const { wins, winningCoords, totalWin, currentMultiplier } = useMemo(() => evaluateTumble(env, tumbleState), [env, tumbleState]);

  const [pulseToggle, setPulseToggle] = useState(false);
  
  const coordsString = useMemo(() => Array.from(winningCoords.keys()).sort().join(','), [winningCoords]);
  useEffect(() => {
    setPulseToggle(p => !p);
  }, [coordsString]);
  const pulseClass = pulseToggle ? 'animate-sync-pulse-1' : 'animate-sync-pulse-2';

  const handleTumble = () => {
    if (wins.length === 0) return;
    applyState(tumbleOnce(env, tumbleState));
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      
      {/* 上半部：設定與控制區 */}
      <div className="flex gap-4 min-h-[220px] shrink-0">
        
        {/* 右側：輸入區與狀態 */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2 bg-dashboard-card p-4 rounded-xl border border-dashboard-border flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dashboard-text-secondary font-bold">輸入 RNGs (從上到下、從左到右)</span>
              <span className="text-xs text-gray-500">剩餘可遞補符號數: <span className="text-dashboard-accent font-bold">{mathIdSequence.length}</span></span>
            </div>
            <textarea
              value={inputArrayStr}
              onChange={(e) => setInputArrayStr(e.target.value)}
              placeholder="請貼上一長串數字 (例如 300 個數字)，將自動取前 30 個作為初始盤面，後續的作為消除掉落的補位來源..."
              className="flex-1 w-full bg-dashboard-card border border-gray-700 rounded p-2 text-xs text-yellow-400 font-mono outline-none focus:border-dashboard-accent resize-none min-h-[60px]"
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
                  className="w-full bg-dashboard-card border border-gray-700 rounded p-2 text-xs text-purple-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
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
                  className="w-full bg-dashboard-card border border-gray-700 rounded p-2 text-xs text-pink-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-dashboard-text-secondary font-bold">輸入Selection</span>
                <textarea
                  value={selectionStr}
                  onChange={(e) => setSelectionStr(e.target.value)}
                  placeholder="Selection..."
                  className="w-full bg-dashboard-card border border-gray-700 rounded p-2 text-xs text-gray-400 font-mono outline-none focus:border-dashboard-accent resize-none h-[50px]"
                />
              </div>
            </div>
          </div>
            <button
              onClick={handleLoadInitialGrid}
              className="w-full py-2 bg-dashboard-card border border-dashboard-accent text-dashboard-accent hover:bg-dashboard-accent hover:text-dashboard-bg rounded font-bold text-sm transition-all"
            >
              載入初始盤面並重置
            </button>
          </div>
        </div>

      {/* 下半部：盤面與控制 */}
      <div className="flex-1 flex flex-col gap-4 bg-dashboard-card p-4 rounded-xl border border-dashboard-border overflow-hidden relative">
        <div className="flex justify-between items-start shrink-0 relative z-50">
          <div className="flex items-start gap-4 text-sm text-gray-400">
            <span className="pt-0.5">消除次數: <span className="text-dashboard-text-primary font-bold">{tumbleCount}</span></span>
            {getTraits(gameType).doublingTumbleMultiplier && <span className="pt-0.5">目前倍數: <span className="text-purple-400 font-bold">x{currentMultiplier}</span></span>}
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
                    <span>目前累積贏分: <span className="text-dashboard-text-primary font-bold">{formatAmount(baseWin * betMultiplier)}</span></span>
                    {gridMultiplier > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-dashboard-bg border border-dashboard-accent text-dashboard-accent">
                        盤面倍數: {gridMultiplier}X
                      </span>
                    )}
                    {isEnd && gridMultiplier > 0 && baseWin > 0 && (
                      <div className="absolute top-full left-0 mt-3 bg-dashboard-raised border border-dashboard-accent/50 rounded-lg p-3 shadow-[0_0_20px_rgba(100,255,218,0.2)] flex flex-col items-end w-[220px] animate-fade-in-up">
                        <span className="text-xs text-gray-400 font-bold mb-0.5">Base Win</span>
                        <span className="text-dashboard-text-primary font-bold text-sm mb-1">{formatAmount(baseWin * betMultiplier)}</span>
                        <span className="text-xs text-gray-400 font-bold mb-0.5">Total Multiplier</span>
                        <span className="text-dashboard-accent font-bold text-sm mb-1">x{gridMultiplier}</span>
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
                  ? 'bg-dashboard-accent text-dashboard-bg hover:bg-dashboard-accent-strong'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {wins.length > 0 ? '執行消除 (Tumble)' : '無可消除連線'}
            </button>
          </div>
        </div>

        <div className="slot-board flex-1 flex justify-center items-center overflow-auto mt-2">
          {currentGridSymbols.length > 0 ? (
            <div className="slot-grid flex slot-gap p-3 sm:p-6 bg-dashboard-raised rounded-xl border border-gray-700/50 relative shadow-xl" style={{ '--cols': currentGridSymbols.length } as React.CSSProperties}>
              {currentGridSymbols.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col justify-end slot-gap">
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
                          customBg = `bg-dashboard-bg border ${ball.border} ${ball.color}`;
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
                        className={`slot-cell flex flex-col items-center justify-center rounded-lg relative transform font-bold
                          ${!isWin && 'transition-all duration-300'} ${
                          isWin
                            ? `z-10 ring-2 scale-105 ${winColorClass} ${pulseClass}`
                            : customBg ? customBg
                            : symbolToneClass(sym)
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
