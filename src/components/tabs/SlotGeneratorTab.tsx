import React, { useState, useEffect, useMemo } from 'react';
import type { GameType } from '../../types';
import type { SVGPathResult } from '../../utils/slotUtils';
import { formatAmount } from '../../utils/slotUtils';
import type { WinResult } from '../../utils/evaluation';

export interface SlotGeneratorTabProps {
  gridContainerRefOther: React.RefObject<HTMLDivElement | null>;
  linePathsOther: SVGPathResult[];
  reelCount: number;
  rowCounts: number[];
  onRowCountsChange: (rows: number[]) => void;
  manualIndicesOther: string[];
  setManualIndicesOther: (val: string[]) => void;
  topTrackerOther: string[];
  setTopTrackerOther: (val: string[]) => void;
  gameType: GameType;
  displayGridOther: string[][];
  winningCoordsOther: Set<string>;
  winsOther: WinResult[];
  betMultiplier: number;
  isSearching: boolean;
  combinations: any[];
  selectedSymbol: string;
  setSelectedSymbol: (val: string) => void;
  groupedSymbols: { id: string, title: string, list: string[] }[];
  parsePasteRng: (text: string, count: number) => string[] | null;
  isRunning: boolean;
}

export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  gridContainerRefOther, linePathsOther, reelCount, rowCounts, onRowCountsChange,
  manualIndicesOther, setManualIndicesOther, topTrackerOther, setTopTrackerOther,
  gameType, displayGridOther, winningCoordsOther, winsOther, betMultiplier,
  isSearching, combinations, selectedSymbol, setSelectedSymbol,
  groupedSymbols, parsePasteRng, isRunning
}) => {
  const [noWinCollapsed, setNoWinCollapsed] = useState(false);
  const [pulseToggle, setPulseToggle] = useState(false);

  const coordsString = useMemo(() => Array.from(winningCoordsOther).sort().join(','), [winningCoordsOther]);
  useEffect(() => {
    setPulseToggle(p => !p);
  }, [coordsString]);

  const pulseClass = pulseToggle ? 'animate-sync-pulse-1' : 'animate-sync-pulse-2';

  return (
    <>
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
                    setManualIndicesOther(comb.rng.map((val: any) => String(val)));
                    if (gameType === 'payanywhere_set2' && comb.fullMathIds) {
                      const initStr = `初始:\n${comb.fullMathIds.slice(0, 30).join(',')}`;
                      let finalCopy = initStr;
                      if (comb.length >= 8) {
                        const dropStr = `\n遞補:\n${comb.fullMathIds.slice(30).join(',')}`;
                        finalCopy += dropStr;
                      }
                      navigator.clipboard.writeText(finalCopy);
                    }
                  }
                }}
                className={`flex justify-between items-center px-4 py-2.5 rounded border text-left transition-all ${comb.rng
                    ? comb.isInterfered
                      ? 'bg-[#112240] border-orange-500/40 hover:border-orange-500 text-dashboard-text-primary cursor-pointer'
                      : 'bg-[#112240] border-gray-700/50 hover:border-dashboard-accent hover:bg-[#112240]/80 text-dashboard-text-primary cursor-pointer'
                    : 'bg-[#112240]/10 border-gray-800/50 text-gray-600 cursor-not-allowed'
                  }`}
              >
                <span className="text-xs font-bold whitespace-pre-line">{comb.name}</span>
                {comb.rng ? (
                  <span className={`text-xs font-mono border bg-[#0a192f] px-1.5 py-0.5 rounded ${comb.isInterfered
                      ? 'text-orange-400 border-orange-500/30'
                      : 'text-[#64ffda] border-[#64ffda]/30'
                    }`}>
                    {gameType === 'payanywhere_set2' ? (
                      <div className="flex flex-col gap-0.5 mt-0.5 max-w-[140px] sm:max-w-[200px]">
                        <span className="text-[#64ffda] leading-tight truncate" title={`初始: [${comb.fullMathIds?.slice(0, 30).join(',')}]`}>
                          初始: [{comb.fullMathIds?.slice(0, 30).join(',')}]
                        </span>
                        {comb.length >= 8 ? (
                          <span className="text-[#64ffda] leading-tight opacity-75 truncate" title={`遞補: [${comb.fullMathIds?.slice(30).join(',')}]`}>
                            遞補: [{comb.fullMathIds?.slice(30).join(',')}] (自動複製)
                          </span>
                        ) : (
                          <span className="text-gray-400 leading-tight opacity-75 text-[10px] truncate">
                            無消除，不產生遞補 (自動複製)
                          </span>
                        )}
                      </div>
                    ) : `RNG: [${comb.rng.join(',')}] ${comb.isInterfered ? '(有干擾)' : ''}`}
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-bold">無可行滾輪位置</span>
                )}
              </button>
            ))}
            {combinations.length === 0 && !isSearching && (
              <div className="col-span-2 py-4 text-center text-xs text-gray-400 font-bold">
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
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount);
                    if (parsed) setManualIndicesOther(parsed);
                    e.target.value = '';
                  }
                }}
                className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-0.5 outline-none focus:border-yellow-500 text-xs w-40 placeholder:text-gray-600 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30">
              <span className="text-xs text-gray-400 font-bold">RNG:</span>
              <code className="text-xs text-yellow-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={`[${manualIndicesOther.map(i => i === '' ? '0' : i).join(',')}]`}>
                [{manualIndicesOther.map(i => i === '' ? '0' : i).join(',')}],
              </code>
              <button
                onClick={() => {
                  const text = `[${manualIndicesOther.map(i => i === '' ? '0' : i).join(',')}],`;
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
                  {gameType !== 'payanywhere_set2' ? (
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-xs text-gray-400 shrink-0">Line</span>
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
                        className="w-full max-w-[45px] bg-[#0a192f] border border-gray-600 text-yellow-400 rounded px-0.5 py-0.5 outline-none focus:border-yellow-500 text-xs text-center"
                      />
                    </div>
                  ) : (
                    <div className="h-[24px] w-full" />
                  )}
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
                <filter id="glow-other" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {linePathsOther.map((p, idx) => {
                const win = winsOther.find(w => w.symbolId === p.symbolId && w.payout > 0);
                const isInterference = selectedSymbol && p.symbolId !== selectedSymbol && !!win;
                return (
                  <g key={idx}>
                    <path
                      d={p.path}
                      fill="none"
                      stroke={isInterference ? "#ef4444" : "#64ffda"}
                      strokeWidth="8"
                      strokeOpacity={isInterference ? "0.35" : "0.45"}
                      filter="url(#glow-other)"
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
                  const isWinning = winningCoordsOther.has(`top-${idx}`);
                  const hasAnyWin = winningCoordsOther.size > 0;
                  return (
                    <div
                      key={idx}
                      id={`cell-top-other-${idx}`}
                      className={`
                        w-20 h-20 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform relative border
                        ${!isWinning && 'transition-all duration-300'}
                        ${topTrackerOther[idx] === 'WILD' || topTrackerOther[idx].startsWith('W') || topTrackerOther[idx] === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border-yellow-300' : 'bg-[#112240] text-dashboard-text-primary border-dashboard-accent/30'}
                        ${isWinning ? `scale-[1.06] border-2 border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b] ${pulseClass}` : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : ''}
                      `}
                    >
                      <span className="text-[11px] text-gray-300 font-bold font-mono tracking-tighter absolute top-1">TOP R{idx + 2}</span>
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
                    
                    let isNoPayoutWin = false;
                    if (isWinning) {
                      const payoutWins = winsOther.filter(w => w.totalWin > 0);
                      const noPayoutWins = winsOther.filter(w => w.totalWin === 0);
                      if (payoutWins.length === 0) {
                        isNoPayoutWin = true;
                      } else if (noPayoutWins.some(w => w.symbolId === symbol) && !payoutWins.some(w => w.symbolId === symbol)) {
                        isNoPayoutWin = true;
                      }
                    }

                    return (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        id={`cell-other-${colIndex}-${rowIndex}`}
                        className={`
                          w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                          shadow-lg transform relative
                          ${!isWinning && 'transition-all duration-300'}
                          ${symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                            symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                              symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                          ${isWinning
                            ? isNoPayoutWin
                              ? `bg-orange-500 text-white scale-105 shadow-[0_0_15px_rgba(249,115,22,0.8)] border border-orange-300 z-10 ${pulseClass}`
                              : `bg-dashboard-accent text-[#0a192f] scale-105 shadow-[0_0_15px_rgba(100,255,218,0.5)] z-10 ${pulseClass}`
                            : hasAnyWin
                              ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]'
                              : ''}
                        `}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span>{symbol}</span>
                          {gameType === 'payanywhere_set2' && manualIndicesOther[colIndex] && (
                            <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none font-normal">
                              ID:{manualIndicesOther[colIndex].split(',')[rowIndex] || '-'}
                            </span>
                          )}
                        </div>
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

          {winsOther.length > 0 ? (() => {
            const winHits   = winsOther.filter(w => w.totalWin > 0);
            const noWinHits = winsOther.filter(w => w.totalWin === 0);
            return (
              <div className="flex gap-3 items-start">
                {/* 左欄：有贏分 */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-dashboard-accent shrink-0" />
                    <span className="text-xs font-bold text-dashboard-accent">有贏分 ({winHits.length})</span>
                  </div>
                  {winHits.length > 0 ? winHits.map((w, idx) => {
                    const isInterference = selectedSymbol === 'B1/B2' 
                      ? (w.symbolId !== 'B1' && w.symbolId !== 'B2')
                      : w.symbolId !== selectedSymbol;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col px-3 py-2 rounded border transition-all ${
                          isInterference
                            ? 'bg-red-950/20 border-red-500/40 animate-pulse'
                            : 'bg-[#112240] border-dashboard-accent/30'
                        }`}
                      >
                        <span className={`text-xs font-mono font-bold truncate ${isInterference ? 'text-red-400' : 'text-yellow-400'}`}>
                          {w.symbolId} {gameType === 'payanywhere' || gameType === 'payanywhere_set2' ? `個數 ${w.matchCount}` : gameType === 'linegame' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`}
                          {isInterference && <span className="ml-1 text-[10px] opacity-80"> (干擾)</span>}
                        </span>
                        <span className={`text-xs font-mono mt-0.5 ${isInterference ? 'text-red-300' : 'text-gray-300'}`}>
                          {formatAmount(betMultiplier)} × {w.payout}{w.ways > 1 ? ` × ${w.ways}` : ''} = <span className={`font-bold ${isInterference ? 'text-red-400' : 'text-dashboard-accent'}`}>{formatAmount(w.totalWin * betMultiplier)}</span>
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="py-3 text-center text-xs text-gray-600">—</div>
                  )}
                  {winHits.length > 0 && (
                    <div className="mt-1 pt-2 border-t border-dashboard-accent/20 flex justify-between items-center px-1">
                      <span className="text-white font-bold text-xs">Total Win</span>
                      <span className="text-dashboard-accent font-bold text-lg">{formatAmount(winHits.reduce((sum, w) => sum + w.totalWin, 0) * betMultiplier)}</span>
                    </div>
                  )}
                </div>

                {/* 分隔線 */}
                <div className="w-px self-stretch bg-gray-700/50 shrink-0" />

                {/* 右欄：無贏分（可摺疊）*/}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <button
                    onClick={() => setNoWinCollapsed(v => !v)}
                    className="flex items-center gap-1.5 mb-1 w-full text-left group cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-400 group-hover:text-gray-300 transition-colors flex-1">
                      無贏分 ({noWinHits.length})
                    </span>
                    <svg
                      className={`w-3 h-3 text-gray-500 transition-transform duration-200 shrink-0 ${noWinCollapsed ? '-rotate-90' : 'rotate-0'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {!noWinCollapsed && (
                    noWinHits.length > 0 ? noWinHits.map((w, idx) => (
                      <div key={idx} className="flex flex-col bg-[#0f1c34] px-3 py-2 rounded border border-gray-700/30">
                        <span className="text-xs font-mono font-bold truncate text-gray-400">
                          {w.symbolId} {gameType === 'payanywhere' || gameType === 'payanywhere_set2' ? `個數 ${w.matchCount}` : gameType === 'linegame' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`}
                        </span>
                        <span className="text-xs text-gray-600 font-mono mt-0.5">
                          payout = 0{w.ways > 1 ? ` × ${w.ways} ways` : ''}
                        </span>
                      </div>
                    )) : (
                      <div className="py-3 text-center text-xs text-gray-600">—</div>
                    )
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="py-4 text-center">
              <span className="text-sm text-gray-400 font-bold">沒有連線</span>
            </div>
          )}
        </div>

      </div>
    </>
  );
};