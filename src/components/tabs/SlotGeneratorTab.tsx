import React, { useState, useEffect, useMemo } from 'react';
import type { GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';
import type { SVGPathResult } from '../../utils/slotUtils';
import { formatAmount, getWinColorClass } from '../../utils/slotUtils';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';

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
  winningCoordsOther: Map<string, number[]>;
  winsOther: WinResult[];
  betMultiplier: number;
  isSearching: boolean;
  combinations: any[];
  selectedSymbol: string;
  setSelectedSymbol: (val: string) => void;
  groupedSymbols: { id: string, title: string, list: string[] }[];
  parsePasteRng: (text: string, count: number, rows: number[]) => string[] | null;
  isRunning: boolean;
  specialSymbolConfig: import('../../types').SpecialSymbolConfig;
  setSpecialSymbolConfig: React.Dispatch<React.SetStateAction<import('../../types').SpecialSymbolConfig>>;
}

export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  gridContainerRefOther, linePathsOther, reelCount, rowCounts, onRowCountsChange,
  manualIndicesOther, setManualIndicesOther, topTrackerOther, setTopTrackerOther,
  gameType, displayGridOther, winningCoordsOther, winsOther, betMultiplier,
  isSearching, combinations, selectedSymbol, setSelectedSymbol,
  groupedSymbols, parsePasteRng, isRunning,
  specialSymbolConfig, setSpecialSymbolConfig
}) => {
  const [noWinCollapsed, setNoWinCollapsed] = useState(false);
  const [pulseToggle, setPulseToggle] = useState(false);
  const [selectedCombIndex, setSelectedCombIndex] = useState(0);
  const [isManualEdited, setIsManualEdited] = useState(false);

  const coordsString = useMemo(() => Array.from(winningCoordsOther.keys()).sort().join(','), [winningCoordsOther]);
  useEffect(() => {
    setPulseToggle(p => !p);
  }, [coordsString]);

  useEffect(() => {
    if (!isSearching && combinations.length > 0) {
      const targetIdx = selectedCombIndex < combinations.length ? selectedCombIndex : 0;
      const comb = combinations[targetIdx];
      if (comb && comb.rng) {
        setManualIndicesOther(comb.rng.map((val: any) => String(val)));
        setIsManualEdited(false);
      }
    }
  }, [combinations, isSearching, setManualIndicesOther, selectedCombIndex]);

  const currentFormattedRngArray = useMemo(() => {
    let formattedRngArray: string[] = [];
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    
    if (gameType === 'payanywhere_set2' && targetComb?.fullMathIds && !isManualEdited) {
      formattedRngArray = targetComb.fullMathIds.slice(0, 30).map((id: number) => String(id));
    } else {
      formattedRngArray = manualIndicesOther.map(colStr => {
        return colStr.split(',').map(cell => {
          const i = cell.trim();
          if (i === '') return '0';
          if (i.includes('_') && i.match(/^[F|L][1-4]_/)) {
            if (i.startsWith('F')) return '15';
            if (i.startsWith('L')) return '19';
            return i.split('_')[0];
          }
          return i;
        }).join(',');
      });
    }
    return formattedRngArray;
  }, [gameType, combinations, selectedCombIndex, isManualEdited, manualIndicesOther]);

  const currentRngString = `[${currentFormattedRngArray.join(',')}],`;

  const pulseClass = pulseToggle ? 'animate-sync-pulse-1' : 'animate-sync-pulse-2';

  const handleDragStart = (e: React.DragEvent, col: number, row: number) => {
    e.dataTransfer.setData("sourceCol", col.toString());
    e.dataTransfer.setData("sourceRow", row.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetCol: number, targetRow: number) => {
    e.preventDefault();
    const sourceColStr = e.dataTransfer.getData("sourceCol");
    const sourceRowStr = e.dataTransfer.getData("sourceRow");
    if (!sourceColStr || !sourceRowStr) return;

    const sourceCol = parseInt(sourceColStr);
    const sourceRow = parseInt(sourceRowStr);

    if (sourceCol === targetCol && sourceRow === targetRow) return;

    const expandCol = (colIdx: number) => {
      const val = manualIndicesOther[colIdx] || '';
      if (val.includes(',')) {
        return val.split(',').map(s => s.trim());
      } else {
        return displayGridOther[colIdx].map(sym => sym);
      }
    };

    const sourceArr = expandCol(sourceCol);

    if (sourceCol === targetCol) {
      const temp = sourceArr[sourceRow];
      sourceArr[sourceRow] = sourceArr[targetRow];
      sourceArr[targetRow] = temp;

      const newIndices = [...manualIndicesOther];
      newIndices[sourceCol] = sourceArr.join(',');
      setManualIndicesOther(newIndices);
    } else {
      const targetArr = expandCol(targetCol);
      const temp = sourceArr[sourceRow];
      sourceArr[sourceRow] = targetArr[targetRow];
      targetArr[targetRow] = temp;

      const newIndices = [...manualIndicesOther];
      newIndices[sourceCol] = sourceArr.join(',');
      newIndices[targetCol] = targetArr.join(',');
      setManualIndicesOther(newIndices);
    }

    setIsManualEdited(true);
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start justify-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full lg:max-w-3xl">
        <div className="flex items-center justify-between bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 w-full max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-dashboard-text-secondary">選擇目標 Symbol:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-[#112240] border border-gray-600 text-dashboard-text-primary rounded px-3 py-1.5 outline-none focus:border-dashboard-accent text-sm cursor-pointer font-bold"
            >
              {groupedSymbols.map(group => {
                const filteredList = group.list.filter(sym => !['S1', 'S2', 'F1', 'L1'].includes(sym));
                if (filteredList.length === 0) return null;
                return (
                  <optgroup key={group.id} label={group.title} className="bg-[#0a192f] text-dashboard-accent font-bold text-xs">
                    {filteredList.map(sym => (
                      <option key={sym} value={sym} className="bg-[#112240] text-dashboard-text-primary font-normal text-sm">
                        {sym}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <span className="text-xs text-dashboard-text-secondary">
            自動列出該符號在當前滾輪表之無干擾單一連線配置
          </span>
        </div>

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
                  setSelectedCombIndex(idx);
                  if (comb.rng) {
                    setManualIndicesOther(comb.rng.map((val: any) => String(val)));
                    setIsManualEdited(false);
                    if (gameType === 'payanywhere_set2') {
                      const initStr = isManualEdited && selectedCombIndex === idx 
                        ? currentRngString 
                        : (comb.fullMathIds ? `[${comb.fullMathIds.slice(0, 30).join(',')}],` : '');
                      let finalCopy = initStr;
                      if (comb.fullMathIds && comb.length >= 8) {
                        const dropMathIds = (comb as any).dropMathIds || [];
                        const dropStr = `[${dropMathIds.slice(0, comb.length).join(',')}],`;
                        finalCopy += dropStr;
                      }
                      navigator.clipboard.writeText(finalCopy);
                    }
                  }
                }}
                className={`flex justify-between items-center px-4 py-2.5 rounded border text-left transition-all ${
                  selectedCombIndex === idx ? 'ring-1 ring-[#64ffda] ' : ''
                }${comb.rng
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
                        <span className="text-[#64ffda] leading-tight truncate" title={selectedCombIndex === idx && isManualEdited ? currentRngString : `[${comb.fullMathIds?.slice(0, 30).join(',')}]`}>
                          {selectedCombIndex === idx && isManualEdited ? currentRngString : `[${comb.fullMathIds?.slice(0, 30).join(',')}],`}
                        </span>
                        {comb.length >= 8 ? (
                          <span className="text-[#64ffda] leading-tight opacity-75 truncate" title={`[${((comb as any).dropMathIds || []).slice(0, comb.length).join(',')}]`}>
                            [{((comb as any).dropMathIds || []).slice(0, comb.length).join(',')}], (自動複製)
                          </span>
                        ) : (
                          <span className="text-gray-400 leading-tight opacity-75 text-[10px] truncate">
                            無消除 (自動複製)
                          </span>
                        )}
                      </div>
                    ) : `RNG: ${selectedCombIndex === idx && isManualEdited ? currentRngString : `[${comb.rng.join(',')}]`} ${comb.isInterfered ? '(有干擾)' : ''}`}
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

        <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-3 rounded-lg border border-gray-700/50 shadow-inner gap-3">
          <div className="flex justify-between items-start border-b border-gray-700/50 pb-3">
            <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">Reel Settings (單一連線測試)</span>
              <input
                type="text"
                placeholder="貼上 RNG 數組..."
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      setManualIndicesOther(parsed);
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}
                className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-1 outline-none focus:border-yellow-500 text-xs w-full placeholder:text-gray-600 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 items-end flex-1 pl-4">
              <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30 w-full justify-between">
                <span className="text-xs text-gray-400 font-bold shrink-0">RNG:</span>
                {(() => {
                  const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
                  const dropLength = winningCoordsOther.size;
                  let dropString = '';
                  if (gameType === 'payanywhere_set2' && targetComb?.dropMathIds && dropLength > 0) {
                    const dropArr = targetComb.dropMathIds.slice(0, dropLength).map((id: number) => String(id));
                    dropString = `[${dropArr.join(',')}],`;
                  }

                  return (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-1 w-full justify-between">
                        <code className="text-xs text-yellow-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={currentRngString}>
                          {currentRngString}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(currentRngString)}
                          className="text-[10px] font-bold bg-[#0a192f] text-dashboard-accent border border-dashboard-accent/50 px-1.5 py-0.5 rounded hover:bg-dashboard-accent hover:text-[#0a192f] transition-colors shrink-0 cursor-pointer"
                        >
                          COPY
                        </button>
                      </div>
                      {dropString && (
                        <div className="flex items-center gap-1 w-full justify-between mt-0.5 pt-1 border-t border-gray-700/50">
                          <span className="text-xs text-gray-400 font-bold shrink-0">遞補:</span>
                          <code className="text-xs text-[#64ffda] font-mono truncate max-w-[120px] sm:max-w-[250px]" title={dropString}>
                            {dropString}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(dropString)}
                            className="text-[10px] font-bold bg-[#0a192f] text-[#64ffda] border border-[#64ffda]/50 px-1.5 py-0.5 rounded hover:bg-[#64ffda] hover:text-[#0a192f] transition-colors shrink-0 cursor-pointer"
                          >
                            COPY
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const classIdsArray: number[] = [];
                manualIndicesOther.forEach(colStr => {
                  colStr.split(',').forEach(cell => {
                    const i = cell.trim();
                    if (i.includes('_') && i.match(/^[F|L][1-4]_/)) {
                      const val = parseInt(i.split('_')[1].replace('X', ''), 10);
                      if (!isNaN(val)) classIdsArray.push(val);
                    }
                  });
                });
                
                if (classIdsArray.length === 0) return null;
                
                const classIdsString = `[${classIdsArray.join(',')}],`;
                return (
                  <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30 w-full justify-between">
                    <span className="text-xs text-gray-400 font-bold shrink-0">ClassIDs:</span>
                    <div className="flex items-center gap-1 overflow-hidden">
                      <code className="text-xs text-purple-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={classIdsString}>
                        {classIdsString}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(classIdsString)}
                        className="text-[10px] font-bold bg-[#0a192f] text-purple-400 border border-purple-400/50 px-1.5 py-0.5 rounded hover:bg-purple-400 hover:text-[#0a192f] transition-colors shrink-0 cursor-pointer"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="flex flex-nowrap justify-center gap-2 w-full">
            {rowCounts.slice(0, reelCount).map((rows, idx) => (
              <div key={idx} className="flex flex-col justify-center items-center gap-1.5 py-2 px-2 bg-[#112240] rounded-md border border-gray-700/50 shadow-sm hover:border-gray-600 transition-colors flex-1 min-w-[70px] max-w-[100px]">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[11px] text-dashboard-accent font-mono font-bold">R{idx + 1}</span>
                  <span className="text-[10px] text-gray-400">Rows</span>
                </div>
                <select
                  value={rows}
                  onChange={(e) => {
                    const newCounts = [...rowCounts];
                    newCounts[idx] = Number(e.target.value);
                    onRowCountsChange(newCounts);
                  }}
                  disabled={isRunning}
                  className="bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-1 py-0.5 outline-none focus:border-dashboard-accent text-[11px] cursor-pointer appearance-none text-center w-full"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {gameType !== 'payanywhere_set2' && (
                  <div className="flex items-center justify-between gap-1 w-full mt-1">
                    <span className="text-[10px] text-gray-400 shrink-0">Line</span>
                    <input
                      type="text"
                      placeholder="-"
                      value={manualIndicesOther[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9,_]/g, '');
                        const newIndices = [...manualIndicesOther];
                        newIndices[idx] = val;
                        setManualIndicesOther(newIndices);
                        setIsManualEdited(true);
                      }}
                      disabled={isRunning}
                      className="w-full bg-[#0a192f] border border-gray-600 text-yellow-400 rounded px-1 py-0.5 outline-none focus:border-yellow-500 text-[11px] text-center"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          ref={gridContainerRefOther}
          className="bg-dashboard-card p-6 rounded-xl shadow-2xl border border-gray-700/30 w-full max-w-3xl overflow-hidden relative"
        >
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
            {gameType === 'megaway' && (
              <div className="flex gap-3 justify-center mb-1">
                <div className="w-20 h-20 bg-transparent" />
                {Array.from({ length: 4 }).map((_, idx) => {
                  const winIndices = winningCoordsOther.get(`top-${idx}`);
                  const isWinning = !!winIndices;
                  const winColorClass = isWinning ? getWinColorClass(winIndices) : '';
                  const hasAnyWin = winningCoordsOther.size > 0;
                  
                  return (
                    <div
                      key={idx}
                      id={`cell-top-other-${idx}`}
                      className={`
                        w-20 h-20 rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform relative border
                        ${isWinning ? `scale-[1.06] border-2 shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-[#152e4b] ${pulseClass} ${winColorClass}` : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : 'bg-[#112240] text-dashboard-text-primary border-dashboard-accent/30'}
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
                <div key={colIndex} className="flex flex-col gap-3">
                  {col.map((symbol, rowIndex) => {
                    const winIndices = winningCoordsOther.get(`${colIndex}-${rowIndex}`);
                    const isWinning = !!winIndices;
                    const winColorClass = isWinning ? getWinColorClass(winIndices) : '';
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

                    let customBg = '';
                    let displaySymbol = symbol;
                    if (symbol.includes('_') && symbol.match(/^[F|L][1-4]_/)) {
                      const [ballId, valStr] = symbol.split('_');
                      displaySymbol = valStr;
                      const numVal = parseInt(valStr.replace('X', ''), 10);
                      const balls = ballId.startsWith('F') ? MULTIPLIER_BALLS : LUCKY_BALLS;
                      const ball = balls.find(b => b.values.includes(numVal)) || balls.find(b => b.id === ballId);
                      if (ball) {
                        customBg = `bg-[#0a192f] border ${ball.border} ${ball.color}`;
                      }
                    }

                    return (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        id={`cell-other-${colIndex}-${rowIndex}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, colIndex, rowIndex)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, colIndex, rowIndex)}
                        className={`
                          w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                          shadow-lg transform relative cursor-grab active:cursor-grabbing
                          ${!isWinning && 'transition-all duration-300'}
                          ${customBg ? customBg :
                            symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                            symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                              symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                          ${isWinning
                            ? `z-10 ring-2 scale-105 ${winColorClass} ${isNoPayoutWin ? 'ring-gray-400 shadow-[0_0_15px_rgba(156,163,175,0.8)]' : ''}`
                            : hasAnyWin
                              ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]'
                              : ''}
                        `}
                      >
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                          <span>{displaySymbol}</span>
                          {gameType === 'payanywhere_set2' && manualIndicesOther[colIndex] && (() => {
                            const rawId = manualIndicesOther[colIndex].split(',')[rowIndex] || '-';
                            let displayId = rawId;
                            if (rawId.includes('_') && rawId.match(/^[F|L][1-4]_/)) {
                              if (rawId.startsWith('F')) displayId = '15';
                              else if (rawId.startsWith('L')) displayId = '19';
                              else displayId = rawId.split('_')[0];
                            }
                            return (
                              <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none font-normal">
                                ID:{displayId}
                              </span>
                            );
                          })()}
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
                  {winHits.length > 0 && (() => {
                    let globalMultiplier = 0;
                    displayGridOther.forEach(col => {
                      col.forEach(sym => {
                        if (sym.includes('_') && sym.match(/^F[1-4]_/)) {
                          const valStr = sym.split('_')[1];
                          const num = parseInt(valStr.replace('X', ''), 10);
                          if (!isNaN(num)) globalMultiplier += num;
                        }
                      });
                    });
                    const finalMultiplier = globalMultiplier > 0 ? globalMultiplier : 1;
                    const baseTotalWin = winHits.reduce((sum, w) => sum + w.totalWin, 0) * betMultiplier;
                    const grandTotalWin = baseTotalWin * finalMultiplier;
                    
                    return (
                      <div className="mt-1 pt-2 border-t border-dashboard-accent/20 flex flex-col gap-1 px-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold text-xs">Base Win</span>
                          <span className="text-gray-300 font-bold text-sm">{formatAmount(baseTotalWin)}</span>
                        </div>
                        {globalMultiplier > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[#64ffda] font-bold text-xs">Total Multiplier</span>
                            <span className="text-[#64ffda] font-bold text-sm">x{globalMultiplier}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-white font-bold text-sm">Total Win</span>
                          <span className="text-dashboard-accent font-bold text-lg">{formatAmount(grandTotalWin)}</span>
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Right Column: Special Symbol & Multiplier Config */}
      <div className="w-full lg:w-[480px] shrink-0 bg-[#0a192f] p-5 rounded-lg border border-gray-700/50 flex flex-col gap-4">
        <span className="text-base font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2 mb-1">特殊符號與倍數球配置</span>
        
        <div className="flex flex-col gap-4 p-4 bg-[#112240] rounded border border-gray-700/50">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-purple-500/20">
              <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSpecialSymbolConfig(prev => ({ ...prev, s1Enabled: checked, s2Enabled: checked }));
                  }} />
                <span className="text-base font-bold text-purple-400">啟用 Scatter (S1/S2)</span>
              </label>
            </div>
            
            {(specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {specialSymbolConfig.s1Enabled && (
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-[#0a192f] border-purple-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                    <span className="text-sm font-bold text-purple-400">S1 (Scatter 1)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      <div className="flex items-center gap-2 bg-[#112240] rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                        <span className="text-sm text-purple-300 font-bold">數量</span>
                        <select className="bg-transparent text-sm text-white outline-none cursor-pointer border-none font-bold"
                          value={specialSymbolConfig.s1Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s1Count: Number(e.target.value) }))}>
                          {[0, 1, 2, 3].map(n => (
                            <option key={n} value={n} className="bg-[#112240] text-white">{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {specialSymbolConfig.s2Enabled && (
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-[#0a192f] border-purple-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                    <span className="text-sm font-bold text-purple-400">S2 (Scatter 2)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      <div className="flex items-center gap-2 bg-[#112240] rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                        <span className="text-sm text-purple-300 font-bold">數量</span>
                        <select className="bg-transparent text-sm text-white outline-none cursor-pointer border-none font-bold"
                          value={specialSymbolConfig.s2Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s2Count: Number(e.target.value) }))}>
                          {[0, 1, 2, 3].map(n => (
                            <option key={n} value={n} className="bg-[#112240] text-white">{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
            <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-dashboard-accent/20">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  <input type="checkbox" className="accent-dashboard-accent w-5 h-5" checked={specialSymbolConfig.multipliersEnabled}
                    onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, multipliersEnabled: e.target.checked }))} />
                  <span className="text-base font-bold text-dashboard-accent">啟用倍數球 (F1~F4)</span>
                </label>
                {specialSymbolConfig.multipliersEnabled && (() => {
                  const total = Object.values(specialSymbolConfig.multiplierCounts).reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex items-center gap-3 mr-1">
                      <span className={`text-sm ${total === 6 ? 'text-dashboard-accent font-bold' : 'text-gray-300 font-bold'}`}>總數: {total}/6 (最多可選 6 顆)</span>
                      {total > 0 && (
                        <button
                          onClick={() => setSpecialSymbolConfig(prev => ({ ...prev, multiplierCounts: {} }))}
                          className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                        >
                          重置歸零
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {specialSymbolConfig.multipliersEnabled && (() => {
                const totalMultipliers = Object.values(specialSymbolConfig.multiplierCounts).reduce((a, b) => a + b, 0);
                return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {MULTIPLIER_BALLS.map(ball => (
                    <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-[#0a192f] ${ball.border} shadow-lg relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                      <div className="flex flex-wrap gap-2 relative z-10">
                        {ball.values.map(val => {
                          const key = `${ball.id}_${val}X`;
                          const count = specialSymbolConfig.multiplierCounts[key] || 0;
                          return (
                            <div key={val} className={`flex items-center gap-2 bg-[#112240] rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-[#64ffda] shadow-[0_0_8px_rgba(100,255,218,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                              <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-[#64ffda]' : 'text-gray-300'}`}>{val}X</span>
                              <select className="bg-transparent text-sm text-white outline-none cursor-pointer border-none font-bold"
                                value={count}
                                onChange={(e) => {
                                const num = Number(e.target.value);
                                if (totalMultipliers + (num - count) > 6) return;
                                setSpecialSymbolConfig(prev => {
                                  const next = { ...prev, multiplierCounts: { ...prev.multiplierCounts, [key]: num } };
                                  if (num === 0) delete next.multiplierCounts[key];
                                  return next;
                                });
                              }}>
                              {[0, 1, 2, 3, 4, 5, 6].map(n => {
                                const wouldExceed = totalMultipliers + (n - count) > 6;
                                return (
                                  <option key={n} value={n} disabled={wouldExceed} className={`bg-[#112240] ${wouldExceed ? 'text-gray-600' : 'text-white'}`}>
                                    {n}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
            })()}

            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-pink-500/20">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  <input type="checkbox" className="accent-pink-500 w-5 h-5" checked={specialSymbolConfig.luckyBallsEnabled}
                    onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, luckyBallsEnabled: e.target.checked }))} />
                  <span className="text-base font-bold text-pink-400">啟用升級倍數球 (L1~L4)</span>
                </label>
                {specialSymbolConfig.luckyBallsEnabled && (() => {
                  const total = Object.values(specialSymbolConfig.luckyCounts).reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex items-center gap-3 mr-1">
                      <span className={`text-sm ${total === 6 ? 'text-pink-400 font-bold' : 'text-gray-300 font-bold'}`}>總數: {total}/6 (最多可選 6 顆)</span>
                      {total > 0 && (
                        <button
                          onClick={() => setSpecialSymbolConfig(prev => ({ ...prev, luckyCounts: {} }))}
                          className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                        >
                          重置歸零
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {specialSymbolConfig.luckyBallsEnabled && (() => {
                const totalLucky = Object.values(specialSymbolConfig.luckyCounts).reduce((a, b) => a + b, 0);
                return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {LUCKY_BALLS.map(ball => (
                    <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-[#0a192f] ${ball.border} shadow-lg relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                      <div className="flex flex-wrap gap-2 relative z-10">
                        {ball.values.map(val => {
                          const key = `${ball.id}_${val}X`;
                          const count = specialSymbolConfig.luckyCounts[key] || 0;
                          return (
                            <div key={val} className={`flex items-center gap-2 bg-[#112240] rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                              <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-pink-400' : 'text-gray-300'}`}>{val}X</span>
                              <select className="bg-transparent text-sm text-white outline-none cursor-pointer border-none font-bold"
                                value={count}
                                onChange={(e) => {
                                const num = Number(e.target.value);
                                if (totalLucky + (num - count) > 6) return;
                                setSpecialSymbolConfig(prev => {
                                  const next = { ...prev, luckyCounts: { ...prev.luckyCounts, [key]: num } };
                                  if (num === 0) delete next.luckyCounts[key];
                                  return next;
                                });
                              }}>
                              {[0, 1, 2, 3, 4, 5, 6].map(n => {
                                const wouldExceed = totalLucky + (n - count) > 6;
                                return (
                                  <option key={n} value={n} disabled={wouldExceed} className={`bg-[#112240] ${wouldExceed ? 'text-gray-600' : 'text-white'}`}>
                                    {n}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
            })()}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};