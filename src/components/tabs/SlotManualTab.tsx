import React from 'react';
import type { GameType } from '../../types';
import type { SVGPathResult } from '../../utils/slotUtils';
import { formatAmount } from '../../utils/slotUtils';
import type { WinResult } from '../../utils/evaluation';

export interface SlotManualTabProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  linePaths: SVGPathResult[];
  reelCount: number;
  rowCounts: number[];
  onRowCountsChange: (rows: number[]) => void;
  manualIndices: string[];
  setManualIndices: (val: string[]) => void;
  topTracker: string[];
  setTopTracker: (val: string[]) => void;
  gameType: GameType;
  displayGrid: string[][];
  winningCoords: Set<string>;
  wins: WinResult[];
  betMultiplier: number;
  parsePasteRng: (text: string, count: number) => string[] | null;
  isRunning: boolean;
  selectedSymbol: string;
}

export const SlotManualTab: React.FC<SlotManualTabProps> = ({
  gridContainerRef, linePaths, reelCount, rowCounts, onRowCountsChange,
  manualIndices, setManualIndices, topTracker, setTopTracker,
  gameType, displayGrid, winningCoords, wins, betMultiplier, parsePasteRng,
  isRunning, selectedSymbol
}) => {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">

        {/* Controls */}
        <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-3 rounded-lg border border-gray-700/50 shadow-inner gap-3">
          <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-2">Reel Settings</span>
              <input
                type="text"
                placeholder="貼上 RNG 數組..."
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount);
                    if (parsed) setManualIndices(parsed);
                    e.target.value = '';
                  }
                }}
                className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-0.5 outline-none focus:border-yellow-500 text-xs w-40 placeholder:text-gray-600 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30">
              <span className="text-xs text-gray-400 font-bold">RNG:</span>
              <code className="text-xs text-yellow-400 font-mono">
                [{manualIndices.map(i => i === '' ? '0' : i).join(',')}],
              </code>
              <button
                onClick={() => {
                  const text = `[${manualIndices.map(i => i === '' ? '0' : i).join(',')}],`;
                  navigator.clipboard.writeText(text);
                }}
                className="text-xs font-bold bg-[#0a192f] text-dashboard-accent border border-dashboard-accent/50 px-2 py-0.5 rounded hover:bg-dashboard-accent hover:text-[#0a192f] transition-colors ml-1 cursor-pointer"
              >
                COPY
              </button>
            </div>
          </div>
          <div className="flex flex-nowrap justify-center gap-1.5 w-full">
            {rowCounts.slice(0, reelCount).map((rows, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5 p-2 bg-[#112240] rounded-md border border-gray-700/50 shadow-sm hover:border-gray-600 transition-colors flex-1 min-w-[65px] max-w-[110px]">
                <span className="text-xs text-dashboard-accent font-mono font-bold mb-0.5">R{idx + 1}</span>
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs text-gray-400 shrink-0">Rows</span>
                    <select
                      value={rows}
                      onChange={(e) => {
                        const newCounts = [...rowCounts];
                        newCounts[idx] = Number(e.target.value);
                        onRowCountsChange(newCounts);
                      }}
                      disabled={isRunning}
                      className="bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-0.5 py-0.5 outline-none focus:border-dashboard-accent text-xs cursor-pointer appearance-none text-center w-full max-w-[45px]"
                    >
                      {[2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs text-gray-400 shrink-0">Line</span>
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
                      className="w-full max-w-[45px] bg-[#0a192f] border border-gray-600 text-yellow-400 rounded px-0.5 py-0.5 outline-none focus:border-yellow-500 text-xs text-center"
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
                <filter id="glow-manual" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {linePaths.map((p, idx) => {
                const win = wins.find(w => w.symbolId === p.symbolId && w.payout > 0);
                const isInterference = selectedSymbol && p.symbolId !== selectedSymbol && !!win;
                return (
                  <g key={idx}>
                    <path
                      d={p.path}
                      fill="none"
                      stroke={isInterference ? "#ef4444" : "#64ffda"}
                      strokeWidth="8"
                      strokeOpacity={isInterference ? "0.35" : "0.45"}
                      filter="url(#glow-manual)"
                    />
                    <path
                      d={p.path}
                      fill="none"
                      stroke={isInterference ? "#fca5a5" : "#ffffff"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="winning-line-flow"
                    />
                  </g>
                );
              })}
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
                      <span className="text-[11px] text-gray-300 font-bold font-mono tracking-tighter absolute top-1">TOP R{idx + 2}</span>
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
                    {formatAmount(betMultiplier)} * {w.payout}{w.ways > 1 ? ` * ${w.ways}` : ''} = <span className="font-bold text-dashboard-accent text-base ml-1">{formatAmount(w.totalWin * betMultiplier)}</span>
                  </span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between items-center px-1">
                <span className="text-white font-bold text-sm">Total Win</span>
                <span className="text-dashboard-accent font-bold text-xl">{formatAmount(wins.reduce((sum, w) => sum + w.totalWin, 0) * betMultiplier)}</span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <span className="text-sm text-gray-400 font-bold">沒有連線</span>
            </div>
          )}
        </div>

      </div>
    </>
  );
};