import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { GameType, PaytableRule, GameConfig } from '../../types';
import { formatAmount } from '../../utils/formatters';
import { getWinColorClass, calculateSVGPaths } from '../../utils/svgPaths';
import { getWinningPositions } from '../../utils/evaluation';
import type { SVGPathResult } from '../../utils/svgPaths';
import { evaluateGrid } from '../../utils/evaluation';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';
import { useRngSearch } from '../../hooks/useRngSearch';

export interface SlotGeneratorTabProps {
  reelCount: number;
  rowCounts: number[];
  onRowCountsChange: (rows: number[]) => void;
  manualIndicesOther: string[];
  setManualIndicesOther: (val: string[]) => void;
  topTrackerOther: string[];
  setTopTrackerOther: (val: string[]) => void;
  gameType: GameType;
  betMultiplier: number;
  selectedSymbol: string;
  setSelectedSymbol: (val: string) => void;
  groupedSymbols: { id: string, title: string, list: string[] }[];
  parsePasteRng: (text: string, count: number, rows: number[]) => string[] | null;
  isRunning: boolean;
  specialSymbolConfig: import('../../types').SpecialSymbolConfig;
  setSpecialSymbolConfig: React.Dispatch<React.SetStateAction<import('../../types').SpecialSymbolConfig>>;
  goldFrames: Record<string, number>;
  setGoldFrames: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  jackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>;
  setJackpots: React.Dispatch<React.SetStateAction<Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>>>;
  clovers: Record<string, boolean>;
  setClovers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentStrips: string[][];
  currentGrid: string[][];
  currentPaytable: PaytableRule[];
  customPaylines?: number[][];
  bet: number;
  isFreeGame: boolean;
}

export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  reelCount, rowCounts, onRowCountsChange,
  manualIndicesOther, setManualIndicesOther, topTrackerOther, setTopTrackerOther,
  gameType, betMultiplier,
  selectedSymbol, setSelectedSymbol,
  groupedSymbols, parsePasteRng, isRunning,
  specialSymbolConfig, setSpecialSymbolConfig,
  goldFrames, setGoldFrames, jackpots, setJackpots, clovers, setClovers,
  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame
}) => {
  const gridContainerRefOther = useRef<HTMLDivElement>(null);
  const [linePathsOther, setLinePathsOther] = useState<SVGPathResult[]>([]);
  const [multiplierIntervals, setMultiplierIntervals] = useState<import('../../types').MultiplierInterval[]>([
    { id: '1', name: 'Big Win', min: 20, max: 50 },
    { id: '2', name: 'Super Win', min: 50, max: 100 },
    { id: '3', name: 'Mega Win', min: 100, max: 300 },
    { id: '4', name: 'Ultra Win', min: 300, max: 1000 },
    { id: '5', name: 'Legend Win', min: 1000, max: null },
  ]);

  const { isSearching, combinations } = useRngSearch(
    selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther, specialSymbolConfig, customPaylines, isFreeGame, bet, multiplierIntervals
  );

  const displayGridOther = useMemo(() => {
    const rawGrid = Array.from({ length: reelCount }, (_, colIndex) => {
      const rowsForThisCol = rowCounts[colIndex] || 3;
      const strip = currentStrips[colIndex];
      const manualInput = manualIndicesOther[colIndex];

      if (manualInput && manualInput !== '') {
        if (strip && strip.length > 0 && !isNaN(Number(manualInput))) {
          const startIndex = Number(manualInput);
          return Array.from({ length: rowsForThisCol }).map((_, rIndex) => {
            const actualIndex = (startIndex + rIndex) % strip.length;
            return strip[actualIndex];
          });
        } else if (manualInput.includes(',')) {
          const mathIds = manualInput.split(',').map(s => s.trim());
          const symbols = mathIds.map(id => {
            if (!isNaN(Number(id))) {
               const numId = Number(id);
               const rule = currentPaytable.find(r => {
                 if (r.mathId === undefined) return false;
                 const ruleIds = String(r.mathId).split(',').map(s => Number(s.trim()));
                 return ruleIds.includes(numId);
               });
               if (rule) {
                 if (rule.symbolId.match(/^[F|L][1-4]$/)) {
                   return `${rule.symbolId}_2X`;
                 }
                 return rule.symbolId;
               }
            }
            return id;
          });
          if (symbols.length >= rowsForThisCol) {
            return symbols.slice(0, rowsForThisCol);
          } else {
            return [...symbols, ...Array(rowsForThisCol - symbols.length).fill('-')];
          }
        }
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

    return rawGrid.map((col, colIndex) => col.map((sym, rowIndex) => {
      if (clovers[`${colIndex}-${rowIndex}`]) return 'S1';
      return sym;
    }));
  }, [reelCount, rowCounts, currentStrips, manualIndicesOther, currentGrid, currentPaytable, clovers]);

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
    const config: GameConfig = {
      gameType,
      paylines: customPaylines,
      effectiveBet: bet,
      goldFrames,
      jackpots,
      specialRules: { derivativeSymbols: { 'B1': ['B2'] } }
    };
    const baseWins = evaluateGrid(finalGrid, currentPaytable, config, undefined, true);

    if (selectedSymbol) {
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

        if (gameType === 'payanywhere' || gameType === 'payanywhere_set2') {
          const count = finalGrid.flat().filter(s => s === selectedSymbol || s === wildSymbol).length;
          if (count > 0) {
            baseWins.push({
              symbolId: selectedSymbol,
              matchCount: count,
              ways: 1,
              payout: 0,
              totalWin: 0
            });
          }
        } else {
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
    }

    return baseWins;
  }, [displayGridOther, currentPaytable, selectedSymbol, currentStrips, reelCount, gameType, topTrackerOther, customPaylines, bet, goldFrames, jackpots]);

  const winningCoordsOther = useMemo(() => {
    return getWinningPositions(displayGridOther, winsOther, currentPaytable, gameType, gameType === 'megaway' ? topTrackerOther : undefined, customPaylines);
  }, [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther, customPaylines, bet]);

  useEffect(() => {
    const updatePaths = () => {
      const p = calculateSVGPaths(displayGridOther, winsOther, currentPaytable, gridContainerRefOther.current, 'other', gameType, gameType === 'megaway' ? topTrackerOther : undefined, customPaylines);
      setLinePathsOther(p);
    };
    const timer = setTimeout(updatePaths, 150);
    window.addEventListener('resize', updatePaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePaths);
    };
  }, [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther, customPaylines]);

  const [noWinCollapsed, setNoWinCollapsed] = useState(false);
  const [pulseToggle, setPulseToggle] = useState(false);
  const [selectedCombIndex, setSelectedCombIndex] = useState(0);
  const [isManualEdited, setIsManualEdited] = useState(false);

  // Gold Frame states
  const [showGoldFrameEditor, setShowGoldFrameEditor] = useState(false);
  const [isGoldFrameMode, setIsGoldFrameMode] = useState(false);
  const [selectedGoldMultiplier, setSelectedGoldMultiplier] = useState<number>(2);

  // Jackpot states
  const [showJackpotEditor, setShowJackpotEditor] = useState(false);
  const [isJackpotMode, setIsJackpotMode] = useState(false);
  const [selectedJackpot, setSelectedJackpot] = useState<'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN' | 'ERASER'>('MINI');

  // Clover states
  const [isCloverMode, setIsCloverMode] = useState(false);

  // Copy feedback state
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  const combinedClassIdStr = useMemo(() => {
    const arr: number[] = [];
    
    // Manual specified mapping for Gold Frames poolIndex
    const multiplierToPoolIndex: Record<number, number> = {
      2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 25: 9, 50: 10, 100: 11
    };
    
    const typeToId = { 'MINI': 12, 'MAJOR': 13, 'MEGA': 14, 'MAXWIN': 15 };

    // Combine all keys
    const allKeys = Array.from(new Set([...Object.keys(goldFrames), ...Object.keys(jackpots)]));
    
    allKeys.sort((a, b) => {
      const [ca, ra] = a.split('-').map(Number);
      const [cb, rb] = b.split('-').map(Number);
      return ca !== cb ? ca - cb : ra - rb;
    });

    for (const key of allKeys) {
      const [col, row] = key.split('-').map(Number);
      
      // If a position has both, Jackpot takes precedence (or we could output both, but usually it's one or the other)
      // Actually let's output both if they exist, but normally they shouldn't overlap in UI due to user behavior
      if (goldFrames[key] !== undefined && jackpots[key] !== undefined) {
         // output jackpot then goldFrame? No, just output what exists. Since they share keys, wait.
         // In UI, they are separate states, so they CAN overlap. Let's output GoldFrame first then Jackpot, or just Jackpot if we assume one per cell.
         // Let's output both if they both exist (unlikely in realistic QA script but possible in UI).
      }

      if (goldFrames[key] !== undefined) {
        const val = goldFrames[key];
        const poolIndex = multiplierToPoolIndex[val] !== undefined ? multiplierToPoolIndex[val] : 0;
        arr.push(col, row, poolIndex);
      }
      
      if (jackpots[key] !== undefined) {
        arr.push(col, row, typeToId[jackpots[key]]);
      }
    }
    
    return arr.length > 0 ? `[${arr.join(', ')}]` : '';
  }, [goldFrames, jackpots]);

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
    const hasClovers = Object.keys(clovers).length > 0;
    
    const s1RawMathId = currentPaytable.find(p => p.symbolId === 'S1')?.mathId;
    const s1MathId = s1RawMathId ? String(s1RawMathId).split(',')[0].trim() : 'S1';
    
    if (gameType === 'payanywhere_set2' && (targetComb as any)?.fullMathIds && !isManualEdited && !hasClovers) {
      formattedRngArray = (targetComb as any).fullMathIds.slice(0, 30).map((id: number) => String(id));
    } else {
      let isPayAnywhereSet2WithClovers = gameType === 'payanywhere_set2' && (targetComb as any)?.fullMathIds && !isManualEdited && hasClovers;
      if (isPayAnywhereSet2WithClovers) {
        formattedRngArray = [...(targetComb as any).fullMathIds.slice(0, 30).map((id: number) => String(id))];
        Object.keys(clovers).forEach(key => {
          const [c, r] = key.split('-').map(Number);
          let flatIdx = 0;
          for(let i=0; i<c; i++) flatIdx += (rowCounts[i] || 3);
          flatIdx += r;
          formattedRngArray[flatIdx] = String(s1MathId);
        });
      } else {
        formattedRngArray = manualIndicesOther.map((colStr, cIdx) => {
          return colStr.split(',').map((cell, rIdx) => {
            if (clovers[`${cIdx}-${rIdx}`]) return String(s1MathId);
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
    }
    return formattedRngArray;
  }, [gameType, combinations, selectedCombIndex, isManualEdited, manualIndicesOther, clovers, currentPaytable, rowCounts]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 w-full max-w-3xl gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-bold text-dashboard-text-secondary whitespace-nowrap">選擇目標 Symbol:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                e.target.blur();
              }}
              onWheel={(e) => e.currentTarget.blur()}
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
              <optgroup label="特殊搜尋" className="bg-[#0a192f] text-orange-400 font-bold text-xs">
                <option value="COMBO" className="bg-[#112240] text-dashboard-text-primary font-normal text-sm">
                  COMBO (連續消除)
                </option>
                <option value="WIN_MULTIPLIER" className="bg-[#112240] text-dashboard-text-primary font-normal text-sm">
                  大獎區間 (Win Multipliers)
                </option>
              </optgroup>
            </select>
          </div>
          <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
            自動列出該符號在當前滾輪表之無干擾單一連線配置
          </span>
        </div>

        {selectedSymbol === 'WIN_MULTIPLIER' && (
          <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700/50 pb-2 mb-3 gap-2">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">
                大獎區間設定 (倍率 = 總贏分 / BET)
              </span>
              <button
                onClick={() => {
                  setMultiplierIntervals(prev => [
                    ...prev,
                    { id: Date.now().toString(), name: 'New Win', min: 0, max: null }
                  ]);
                }}
                className="px-2 py-1 text-xs font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                + 新增區間
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1 mb-3">
              {multiplierIntervals.map((interval, index) => (
                <div key={interval.id} className="flex items-center gap-2 bg-[#112240] p-2 rounded border border-gray-700/50">
                  <input
                    type="text"
                    value={interval.name}
                    onChange={(e) => {
                      const newIntervals = [...multiplierIntervals];
                      newIntervals[index].name = e.target.value;
                      setMultiplierIntervals(newIntervals);
                    }}
                    placeholder="區間名稱"
                    className="flex-1 bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-2 py-1 outline-none focus:border-dashboard-accent text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Min:</span>
                    <input
                      type="number"
                      value={interval.min}
                      onChange={(e) => {
                        const newIntervals = [...multiplierIntervals];
                        newIntervals[index].min = Number(e.target.value);
                        setMultiplierIntervals(newIntervals);
                      }}
                      className="w-16 bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-2 py-1 outline-none focus:border-dashboard-accent text-sm"
                    />
                  </div>
                  <span className="text-xs text-gray-400">~</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Max:</span>
                    <input
                      type="number"
                      value={interval.max === null ? '' : interval.max}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newIntervals = [...multiplierIntervals];
                        newIntervals[index].max = val === '' ? null : Number(val);
                        setMultiplierIntervals(newIntervals);
                      }}
                      placeholder="∞"
                      className="w-16 bg-[#0a192f] border border-gray-600 text-dashboard-text-primary rounded px-2 py-1 outline-none focus:border-dashboard-accent text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newIntervals = [...multiplierIntervals];
                      newIntervals.splice(index, 1);
                      setMultiplierIntervals(newIntervals);
                    }}
                    className="ml-1 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              disabled={isSearching || multiplierIntervals.length === 0}
              onClick={() => {
                // To re-trigger search, we can just momentarily clear and re-set selectedSymbol
                setSelectedSymbol('');
                setTimeout(() => setSelectedSymbol('WIN_MULTIPLIER'), 0);
              }}
              className="w-full py-2 bg-dashboard-accent/20 text-dashboard-accent border border-dashboard-accent/50 rounded font-bold text-sm hover:bg-dashboard-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-dashboard-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  搜尋大獎區間中... (最多 150,000 次試轉)
                </>
              ) : (
                '產生對應大獎 RNG'
              )}
            </button>
          </div>
        )}

        <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 shadow-inner">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700/50 pb-2 mb-3 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">
                連線組合清單 (點擊自動套用 RNG 盤面)
              </span>
              <button
                disabled={isSearching || combinations.length === 0}
                onClick={() => {
                  const textToCopy = [...combinations]
                    .filter(c => c.rng)
                    .sort((a, b) => {
                      const aHasWild = a.wildCount > 0 ? 1 : 0;
                      const bHasWild = b.wildCount > 0 ? 1 : 0;
                      if (aHasWild !== bHasWild) return aHasWild - bHasWild;
                      if (a.length !== b.length) return a.length - b.length;
                      return a.wildCount - b.wildCount;
                    })
                    .map(c => {
                      if (gameType === 'payanywhere_set2' || gameType === 'linegame_set2') {
                        let finalCopy = (c as any).fullMathIds ? `[${(c as any).fullMathIds.slice(0, 30).join(',')}],` : `[${c.rng?.join(',')}],`;
                        if (gameType === 'payanywhere_set2' && (c as any).fullMathIds && c.length >= 8) {
                          const dropMathIds = (c as any).dropMathIds || [];
                          const dropCount = c.length;
                          const dropStr = `[${dropMathIds.slice(0, dropCount).join(',')}],`;
                          finalCopy += dropStr;
                        }
                        return finalCopy;
                      }
                      return `[${c.rng?.join(',')}],`;
                    })
                    .join('\n');
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopiedAll(true);
                  setTimeout(() => setIsCopiedAll(false), 2000);
                }}
                className={`px-2 py-1 text-xs font-bold rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCopiedAll 
                    ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                    : 'bg-[#64ffda]/10 hover:bg-[#64ffda]/20 text-[#64ffda] border-[#64ffda]/30'
                }`}
              >
                {isCopiedAll ? '✅ 已複製！' : '📋 複製全部腳本'}
              </button>
            </div>
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
                    if (gameType === 'payanywhere_set2' || gameType === 'linegame_set2') {
                      const initStr = isManualEdited && selectedCombIndex === idx 
                        ? currentRngString 
                        : ((comb as any).fullMathIds ? `[${(comb as any).fullMathIds.slice(0, 30).join(',')}],` : '');
                      let finalCopy = initStr;
                      if ((comb as any).fullMathIds && comb.length >= (gameType === 'linegame_set2' ? 3 : 8)) {
                        const dropMathIds = (comb as any).dropMathIds || [];
                        const dropCount = comb.length;
                        const dropStr = `[${dropMathIds.slice(0, dropCount).join(',')}],`;
                        finalCopy += dropStr;
                      }
                      navigator.clipboard.writeText(finalCopy);
                    } else {
                      // For other game types, just copy the base RNG indices
                      const finalCopy = `[${comb.rng.join(',')}],`;
                      navigator.clipboard.writeText(finalCopy);
                    }
                  }
                }}
                className={`flex justify-between items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                  selectedCombIndex === idx ? 'ring-1 ring-[#64ffda] ' : ''
                }${comb.rng
                    ? (comb.isInterfered || (comb as any).hasS1Drop)
                      ? 'bg-[#112240] border-orange-500/40 hover:border-orange-500 text-dashboard-text-primary cursor-pointer'
                      : 'bg-[#112240] border-gray-700/50 hover:border-dashboard-accent hover:bg-[#112240]/80 text-dashboard-text-primary cursor-pointer'
                    : 'bg-[#112240]/10 border-gray-800/50 text-gray-600 cursor-not-allowed'
                  }`}
              >
                <span className="text-xs font-bold whitespace-pre-line shrink-0">{comb.name}</span>
                {comb.rng ? (
                  <div className={`text-xs font-mono border bg-[#0a192f] px-1.5 py-0.5 rounded min-w-0 flex-1 truncate text-right ${(comb.isInterfered || (comb as any).hasS1Drop)
                      ? 'text-orange-400 border-orange-500/30'
                      : 'text-[#64ffda] border-[#64ffda]/30'
                    }`}>
                    {gameType === 'payanywhere_set2' || gameType === 'linegame_set2' ? (
                      <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                        <span className="text-[#64ffda] leading-tight truncate block" title={selectedCombIndex === idx && isManualEdited ? currentRngString : `[${(comb as any).fullMathIds?.slice(0, 30).join(',')}]`}>
                          {selectedCombIndex === idx && isManualEdited ? currentRngString : `[${(comb as any).fullMathIds?.slice(0, 30).join(',')}],`}
                        </span>
                        {gameType === 'payanywhere_set2' && (comb as any).dropMathIds && (comb as any).dropMathIds.length > 0 ? (
                          <span className="text-[#64ffda] leading-tight opacity-75 truncate block" title={`[${((comb as any).dropMathIds || []).slice(0, comb.length).join(',')}]`}>
                            [{((comb as any).dropMathIds || []).slice(0, comb.length).join(',')}], (自動複製)
                          </span>
                        ) : gameType === 'payanywhere_set2' ? (
                          <span className="text-gray-400 leading-tight opacity-75 text-[10px] truncate block">
                            無消除 (自動複製)
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="truncate block" title={`RNG: ${selectedCombIndex === idx && isManualEdited ? currentRngString : `[${comb.rng.join(',')}]`} ${comb.isInterfered ? '(有干擾)' : ''} ${(comb as any).hasS1Drop ? '(有S1掉落)' : ''}`}>
                        {`RNG: ${selectedCombIndex === idx && isManualEdited ? currentRngString : `[${comb.rng.join(',')}]`} ${comb.isInterfered ? '(有干擾)' : ''} ${(comb as any).hasS1Drop ? '(有S1掉落)' : ''}`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-red-500 font-bold shrink-0">無可行滾輪位置</span>
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
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-700/50 pb-3 gap-3">
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
                  if (gameType === 'payanywhere_set2' && (targetComb as any)?.dropMathIds && dropLength > 0) {
                    const dropArr = (targetComb as any).dropMathIds.slice(0, dropLength).map((id: number) => String(id));
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

              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-dashboard-card p-6 rounded-xl shadow-2xl border border-gray-700/30 w-full max-w-3xl overflow-hidden flex justify-center items-center"
        >
          <div ref={gridContainerRefOther} className="relative inline-flex flex-col items-center justify-center">
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
                    if (symbol === 'S1' && gameType === 'linegame_set2') {
                      displaySymbol = '🍀';
                    }
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
                        onClick={() => {
                          const key = `${colIndex}-${rowIndex}`;
                          if (isGoldFrameMode) {
                            setGoldFrames(prev => {
                              const next = { ...prev };
                              if (selectedGoldMultiplier === 0) delete next[key];
                              else if (next[key] === selectedGoldMultiplier) delete next[key];
                              else next[key] = selectedGoldMultiplier;
                              return next;
                            });
                          } else if (isJackpotMode) {
                            setJackpots(prev => {
                              const next = { ...prev };
                              if (selectedJackpot === 'ERASER') delete next[key];
                              else if (next[key] === selectedJackpot) delete next[key];
                              else next[key] = selectedJackpot;
                              return next;
                            });
                          } else if (isCloverMode) {
                            setClovers(prev => {
                              if (prev[key]) return {};
                              return { [key]: true };
                            });
                          }
                        }}
                        draggable={!isGoldFrameMode && !isJackpotMode && !isCloverMode}
                        onDragStart={(e) => !isGoldFrameMode && !isJackpotMode && !isCloverMode && handleDragStart(e, colIndex, rowIndex)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => !isGoldFrameMode && !isJackpotMode && !isCloverMode && handleDrop(e, colIndex, rowIndex)}
                        className={`
                          w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                          shadow-lg transform relative cursor-grab active:cursor-grabbing
                          ${!isWinning && 'transition-all duration-300'}
                          ${customBg ? customBg :
                            symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                            symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                              symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                symbol === 'S1' ? 'bg-[#0f1d35] text-green-400 border border-green-500/50' :
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
                        {showGoldFrameEditor && goldFrames[`${colIndex}-${rowIndex}`] !== undefined && (
                          <div className="absolute inset-0 rounded-lg border-[3px] border-yellow-400 pointer-events-none z-20 flex items-end justify-end p-0.5">
                            <span className="text-[9px] font-bold text-[#0a192f] bg-yellow-400 px-1 rounded-sm leading-tight shadow-sm">
                              {goldFrames[`${colIndex}-${rowIndex}`]}X
                            </span>
                          </div>
                        )}
                        {showJackpotEditor && jackpots[`${colIndex}-${rowIndex}`] !== undefined && (
                          <div className="absolute inset-0 rounded-lg border-[3px] border-red-500 pointer-events-none z-20 flex items-end justify-end p-0.5">
                            <span className="text-[9px] font-bold text-white bg-red-500 px-1 rounded-sm leading-tight shadow-sm">
                              {jackpots[`${colIndex}-${rowIndex}`]}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
      {!gameType.startsWith('waygame') && (
      <div className="w-full lg:w-[480px] shrink-0 bg-[#0a192f] p-5 rounded-lg border border-gray-700/50 flex flex-col gap-4">
        <span className="text-base font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2 mb-1">特殊符號與倍數球配置</span>
        
        <div className="flex flex-col gap-4 p-4 bg-[#112240] rounded border border-gray-700/50">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-purple-500/20">
              <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                {gameType === 'linegame_set2' ? (
                  <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={showGoldFrameEditor}
                    onChange={(e) => setShowGoldFrameEditor(e.target.checked)} />
                ) : (
                  <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSpecialSymbolConfig(prev => ({ ...prev, s1Enabled: checked, s2Enabled: checked }));
                      if (!checked) {
                        setClovers({});
                        setIsCloverMode(false);
                      }
                    }} />
                )}
                <span className="text-base font-bold text-purple-400">{gameType === 'linegame_set2' ? '啟用金框' : '啟用 Scatter (S1/S2)'}</span>
              </label>
            </div>
            
            {gameType === 'linegame_set2' && showGoldFrameEditor && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-dashboard-text-secondary">金框倍數 ID:</span>
                    <select 
                      value={selectedGoldMultiplier}
                      onChange={e => setSelectedGoldMultiplier(Number(e.target.value))}
                      className="bg-[#0a192f] border border-dashboard-accent/30 text-white rounded px-2 py-1 text-sm outline-none focus:border-dashboard-accent cursor-pointer"
                    >
                      <option value={0}>🧽 橡皮擦 (刪除)</option>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 50, 100].map(m => (
                        <option key={m} value={m}>{m}X</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setGoldFrames({})}
                    className="text-xs font-bold px-2 py-1 rounded border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 transition-colors shadow-sm"
                  >
                    全部重置
                  </button>
                </div>
                <button
                  onClick={() => {
                    const next = !isGoldFrameMode;
                    setIsGoldFrameMode(next);
                    if (next) {
                      setIsJackpotMode(false);
                      setIsCloverMode(false);
                    }
                  }}
                  className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                    isGoldFrameMode 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 ring-1 ring-yellow-400' 
                      : 'bg-[#0a192f] text-gray-400 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  👑 金框編輯模式 {isGoldFrameMode ? '(ON)' : '(OFF)'}
                </button>
              </div>
            )}

            {gameType === 'linegame_set2' && (
              <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-red-500/20 mt-2">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  <input type="checkbox" className="accent-red-500 w-5 h-5" checked={showJackpotEditor}
                    onChange={(e) => setShowJackpotEditor(e.target.checked)} />
                  <span className="text-base font-bold text-red-400">啟用大獎 (Jackpot)</span>
                </label>
              </div>
            )}

            {gameType === 'linegame_set2' && showJackpotEditor && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-dashboard-text-secondary">選擇大獎類型:</span>
                    <select 
                      value={selectedJackpot}
                      onChange={e => setSelectedJackpot(e.target.value as any)}
                      className="bg-[#0a192f] border border-red-500/30 text-white rounded px-2 py-1 text-sm outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="ERASER">🧽 橡皮擦 (刪除)</option>
                      <option value="MINI">MINI (25x)</option>
                      <option value="MAJOR">MAJOR (100x)</option>
                      <option value="MEGA">MEGA (500x)</option>
                      <option value="MAXWIN">MAXWIN (20000x)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setJackpots({})}
                    className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                  >
                    全部重置
                  </button>
                </div>
                <button
                  onClick={() => {
                    const next = !isJackpotMode;
                    setIsJackpotMode(next);
                    if (next) {
                      setIsGoldFrameMode(false);
                      setIsCloverMode(false);
                    }
                  }}
                  className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                    isJackpotMode 
                      ? 'bg-red-500/20 text-red-400 border-red-500 ring-1 ring-red-400' 
                      : 'bg-[#0a192f] text-gray-400 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  🎯 大獎編輯模式 {isJackpotMode ? '(ON)' : '(OFF)'}
                </button>
              </div>
            )}

            {gameType === 'linegame_set2' && (
              <>
              {combinedClassIdStr && (
                <div className="flex items-center gap-2 bg-[#112240] px-2 py-1 rounded border border-gray-700/30 w-full justify-between mt-2">
                  <span className="text-xs text-yellow-400 font-bold shrink-0">ClassIDs:</span>
                  <div className="flex items-center gap-1 overflow-hidden">
                    <code className="text-xs text-yellow-400 font-mono truncate w-[85%]" title={combinedClassIdStr}>
                      {combinedClassIdStr}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(combinedClassIdStr)}
                      className="text-[10px] font-bold bg-[#0a192f] text-yellow-400 border border-yellow-400/50 px-1.5 py-0.5 rounded hover:bg-yellow-400 hover:text-[#0a192f] transition-colors shrink-0 cursor-pointer"
                    >
                      COPY
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
            
            {gameType !== 'linegame_set2' && (specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled) && (
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
          
          {(gameType === 'linegame_set2' || gameType === 'payanywhere' || gameType === 'payanywhere_set2') && (
            <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between bg-[#0a192f] p-2 rounded-lg border border-dashboard-accent/20">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  {gameType === 'linegame_set2' ? (
                    <input type="checkbox" className="accent-dashboard-accent w-5 h-5" checked={specialSymbolConfig.s1Enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSpecialSymbolConfig(prev => ({ ...prev, s1Enabled: checked, s1Count: 0 }));
                        if (!checked) {
                          setClovers({});
                          setIsCloverMode(false);
                        }
                      }} />
                  ) : (
                    <input type="checkbox" className="accent-dashboard-accent w-5 h-5" checked={specialSymbolConfig.multipliersEnabled}
                      onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, multipliersEnabled: e.target.checked }))} />
                  )}
                  <span className="text-base font-bold text-dashboard-accent">{gameType === 'linegame_set2' ? '啟用幸運草' : '啟用倍數球 (F1~F4)'}</span>
                </label>
                {specialSymbolConfig.multipliersEnabled && gameType !== 'linegame_set2' && (() => {
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
              
              {gameType === 'linegame_set2' && specialSymbolConfig.s1Enabled && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-[#0a192f] border-[#64ffda]/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-[#64ffda]"></div>
                    <span className="text-sm font-bold text-[#64ffda]">幸運草 (S1)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">

                      <button
                        onClick={() => {
                          const next = !isCloverMode;
                          setIsCloverMode(next);
                          if (next) { setIsGoldFrameMode(false); setIsJackpotMode(false); }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                          isCloverMode 
                            ? 'bg-[#64ffda]/20 text-[#64ffda] border-[#64ffda] ring-1 ring-[#64ffda]' 
                            : 'bg-[#112240] text-gray-400 border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        🍀 幸運草編輯模式 {isCloverMode ? '(ON)' : '(OFF)'}
                      </button>

                    </div>
                  </div>
                </div>
              )}
              
              {gameType !== 'linegame_set2' && specialSymbolConfig.multipliersEnabled && (() => {
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

            {gameType !== 'linegame_set2' && (
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
            )}
          </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
};