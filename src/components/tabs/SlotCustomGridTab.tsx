import React, { useState, useMemo } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import type { GameType, PaytableRule, GameConfig } from '../../types';
import { evaluateGrid } from '../../utils/evaluation';
import { getWinningPositions, formatAmount, getWinColorClass } from '../../utils/slotUtils';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';

export interface SlotCustomGridTabProps {
  reelCount: number;
  rowCounts: number[];
  currentPaytable: PaytableRule[];
  groupedSymbols: { id: string, title: string, list: string[] }[];
  gameType: GameType;
  betMultiplier: number;
  customPaylines?: number[][];
}

export const SlotCustomGridTab: React.FC<SlotCustomGridTabProps> = ({
  reelCount, rowCounts, currentPaytable, groupedSymbols, gameType, betMultiplier, customPaylines
}) => {
  // --- States ---
  const [gridSymbols, setGridSymbols] = useState<string[][]>(() => {
    // Initialize with a default symbol, e.g., the lowest value symbol or just '-'
    return Array.from({ length: reelCount }, (_, c) => 
      Array(rowCounts[c] || 3).fill('-')
    );
  });

  const [hiddenPaletteSymbols, setHiddenPaletteSymbols] = useState<Set<string>>(new Set());
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(250);
  const [selectedPaletteSymbol, setSelectedPaletteSymbol] = useState<string | null>(null);

  // --- Compute ---
  // MathID reverse lookup for base RNG generation
  const symbolToMathId = useMemo(() => {
    const map: Record<string, number> = {};
    currentPaytable.forEach(r => {
      if (r.mathId !== undefined) {
        const ids = String(r.mathId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (ids.length > 0) {
          map[r.symbolId] = ids[0]; // Use the first available MathID
        }
      }
    });
    return map;
  }, [currentPaytable]);

  // Evaluate the grid
  const { wins, winningCoords } = useMemo(() => {
    const config: GameConfig = {
      gameType,
      paylines: customPaylines || [],
      effectiveBet: betMultiplier * 30, // Rough assumption for config
      specialRules: { derivativeSymbols: { 'B1': ['B2'] } }
    };
    const wins = evaluateGrid(gridSymbols, currentPaytable, config, undefined, true);
    const winningCoords = getWinningPositions(gridSymbols, wins, currentPaytable, gameType, undefined, customPaylines);
    return { wins, winningCoords };
  }, [gridSymbols, currentPaytable, gameType, customPaylines, betMultiplier]);

  // Smart Dummy Drops Generation
  const dropRng = useMemo(() => {
    if (winningCoords.size === 0) return '';
    
    // Calculate current symbol counts to avoid secondary wins
    const currentCounts: Record<string, number> = {};
    gridSymbols.forEach((col, cIdx) => {
      col.forEach((sym, rIdx) => {
        if (!winningCoords.has(`${cIdx}-${rIdx}`) && sym !== '-') {
          const baseSym = sym.split('_')[0];
          currentCounts[baseSym] = (currentCounts[baseSym] || 0) + 1;
        }
      });
    });

    const dropMathIds: number[] = [];
    const availableRules = currentPaytable.filter(r => 
      !r.isWild && !r.isScatter && !r.symbolId.match(/^[F|L][1-4]/) && r.mathId !== undefined
    );

    let uniqueWinCoordsCount = winningCoords.size;

    for (let i = 0; i < uniqueWinCoordsCount; i++) {
      // Find a safe symbol that won't reach 8 count (for payanywhere)
      let safeRule = availableRules.find(r => (currentCounts[r.symbolId] || 0) < 6);
      if (!safeRule) safeRule = availableRules[0]; // Fallback

      if (safeRule) {
        currentCounts[safeRule.symbolId] = (currentCounts[safeRule.symbolId] || 0) + 1;
        dropMathIds.push(symbolToMathId[safeRule.symbolId] || 0);
      } else {
        dropMathIds.push(0);
      }
    }

    return `[${dropMathIds.join(',')}],`;
  }, [winningCoords, gridSymbols, currentPaytable, symbolToMathId]);

  // Base RNG String
  const baseRngStr = useMemo(() => {
    const flatIds: number[] = [];
    gridSymbols.forEach(col => {
      col.forEach(sym => {
        if (sym === '-') {
          flatIds.push(0);
          return;
        }
        let baseSym = sym;
        if (sym.includes('_')) {
          [baseSym] = sym.split('_');
        }
        flatIds.push(symbolToMathId[baseSym] || 0);
      });
    });
    return `[${flatIds.join(',')}],`;
  }, [gridSymbols, symbolToMathId]);

  // --- Handlers ---
  const handleDragStart = (e: React.DragEvent, symbolId: string, isFromPalette: boolean, col?: number, row?: number) => {
    const isSpecial = symbolId.match(/^[F|L][1-4]/);
    const dragSym = (isFromPalette && isSpecial) ? `${symbolId}_${selectedMultiplier}X` : symbolId;
    
    e.dataTransfer.setData("symbol", dragSym);
    e.dataTransfer.setData("isFromPalette", isFromPalette.toString());
    if (!isFromPalette && col !== undefined && row !== undefined) {
      e.dataTransfer.setData("sourceCol", col.toString());
      e.dataTransfer.setData("sourceRow", row.toString());
    }
  };

  const handleDrop = (e: React.DragEvent, targetCol: number, targetRow: number) => {
    e.preventDefault();
    const symbol = e.dataTransfer.getData("symbol");
    const isFromPalette = e.dataTransfer.getData("isFromPalette") === "true";

    if (!symbol) return;

    const newGrid = gridSymbols.map(col => [...col]);

    if (isFromPalette) {
      newGrid[targetCol][targetRow] = symbol;
    } else {
      const sourceColStr = e.dataTransfer.getData("sourceCol");
      const sourceRowStr = e.dataTransfer.getData("sourceRow");
      if (!sourceColStr || !sourceRowStr) return;
      
      const sourceCol = parseInt(sourceColStr);
      const sourceRow = parseInt(sourceRowStr);
      
      if (sourceCol === targetCol && sourceRow === targetRow) return;
      
      const temp = newGrid[sourceCol][sourceRow];
      newGrid[sourceCol][sourceRow] = newGrid[targetCol][targetRow];
      newGrid[targetCol][targetRow] = temp;
    }

    setGridSymbols(newGrid);
  };

  const togglePaletteSymbol = (sym: string) => {
    setHiddenPaletteSymbols(prev => {
      const next = new Set(prev);
      const isHiding = !next.has(sym);
      if (isHiding) {
        next.add(sym);
        setGridSymbols(prevGrid => 
          prevGrid.map(col => 
            col.map(cell => {
              const baseSym = cell.split('_')[0];
              return baseSym === sym ? '-' : cell;
            })
          )
        );
        if (selectedPaletteSymbol === sym) {
          setSelectedPaletteSymbol(null);
        }
      } else {
        next.delete(sym);
      }
      return next;
    });
  };

  const handleCellClick = (colIndex: number, rowIndex: number) => {
    if (!selectedPaletteSymbol) return;
    const isSpecial = selectedPaletteSymbol.match(/^[F|L][1-4]/);
    const newSym = isSpecial ? `${selectedPaletteSymbol}_${selectedMultiplier}X` : selectedPaletteSymbol;
    
    const newGrid = gridSymbols.map(col => [...col]);
    newGrid[colIndex][rowIndex] = newSym;
    setGridSymbols(newGrid);
  };

  const handleReset = () => {
    setGridSymbols(Array.from({ length: reelCount }, (_, c) => 
      Array(rowCounts[c] || 3).fill('-')
    ));
  };

  const allPaletteSymbols = useMemo(() => {
    const list: string[] = [];
    groupedSymbols.forEach(g => {
      g.list.forEach(sym => {
        if (sym === 'B1/B2') {
          list.push('B1');
          list.push('B2');
        } else {
          list.push(sym);
        }
      });
    });
    return list;
  }, [groupedSymbols]);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch justify-center h-full overflow-y-auto">
      {/* Left: Palette & Config */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 max-h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-sm font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2">方塊調色盤 (Palette)</h2>
        
        {/* Special Symbol Multiplier Config */}
        <div className="bg-[#112240] p-3 rounded-md border border-gray-700/50">
          <span className="text-xs text-dashboard-accent font-bold mb-2 block">拖曳特殊符號預設倍數:</span>
          <select 
            value={selectedMultiplier}
            onChange={e => setSelectedMultiplier(Number(e.target.value))}
            className="w-full bg-[#0a192f] border border-dashboard-accent/30 text-white rounded px-2 py-1 text-sm outline-none focus:border-dashboard-accent cursor-pointer"
          >
            {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500].map(m => (
              <option key={m} value={m}>{m}X</option>
            ))}
          </select>
        </div>

        {/* MathID & Visibility Toggles */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400 font-bold border-b border-gray-700/30 pb-1">可拖曳符號 (點擊可隱藏/顯示)</span>
          <div className="flex flex-wrap gap-1">
            {allPaletteSymbols.map(symId => (
              <button
                key={symId}
                onClick={() => togglePaletteSymbol(symId)}
                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                  hiddenPaletteSymbols.has(symId) 
                    ? 'bg-[#112240]/50 text-gray-500 border-gray-800' 
                    : 'bg-[#152e4b] text-dashboard-text-primary border-gray-600 hover:border-dashboard-accent'
                }`}
              >
                {symId}
              </button>
            ))}
          </div>
        </div>

        {/* Draggable Palette Blocks */}
        <div className="grid grid-cols-4 gap-2 mt-2 pb-2">
          {allPaletteSymbols.filter(symId => !hiddenPaletteSymbols.has(symId)).map(symId => {
            let customBg = '';
            if (symId.match(/^[F|L][1-4]/)) {
               const balls = symId.startsWith('F') ? MULTIPLIER_BALLS : LUCKY_BALLS;
               const ball = balls.find(b => b.values.includes(selectedMultiplier)) || balls.find(b => b.id === symId);
               if (ball) customBg = `border ${ball.border} ${ball.color.replace('text-', 'bg-').replace('500', '900/50')}`;
            }

            return (
                <div
                  key={symId}
                  draggable
                  onClick={() => setSelectedPaletteSymbol(prev => prev === symId ? null : symId)}
                  onDragStart={(e) => handleDragStart(e, symId, true)}
                  className={`
                    w-12 h-12 rounded flex items-center justify-center font-bold text-sm cursor-pointer shadow-md transition-all active:scale-95
                    ${selectedPaletteSymbol === symId ? 'ring-2 ring-dashboard-accent scale-105 z-10' : ''}
                    ${customBg ? customBg : 'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                  `}
                  title={symId}
                >
                <div className="flex flex-col items-center pointer-events-none">
                  <span>{symId}</span>
                  {symId.match(/^[F|L][1-4]/) && (
                    <span className="text-[9px] text-[#64ffda] leading-none mt-1">{selectedMultiplier}X</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Grid */}
      <div className="flex-1 min-w-[300px] sm:min-w-[400px] flex flex-col items-center gap-4 bg-[#0a192f] p-4 sm:p-6 rounded-lg border border-gray-700/50 shadow-inner overflow-x-auto">
        <div className="flex items-center justify-between w-full border-b border-gray-700/50 pb-2">
          <span className="text-sm font-bold text-dashboard-text-secondary">編輯盤面區 (自由拖曳)</span>
          <button 
            onClick={handleReset}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500 hover:text-white transition-colors"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
        
        <div className="flex justify-center items-center gap-3 bg-[#050b14] p-4 sm:p-6 rounded-xl border-2 border-gray-800 shadow-inner w-full overflow-x-auto custom-scrollbar">
          {gridSymbols.map((col, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-3">
              {col.map((symbol, rowIndex) => {
                const winIndices = winningCoords.get(`${colIndex}-${rowIndex}`);
                const isWinning = !!winIndices;
                const winColorClass = isWinning ? getWinColorClass(winIndices) : '';
                let displaySymbol = symbol;
                let customBg = '';
                
                if (symbol.includes('_') && symbol.match(/^[F|L][1-4]_/)) {
                  const [ballId, val] = symbol.split('_');
                  displaySymbol = val;
                  const numVal = parseInt(val.replace('X', ''), 10);
                  const balls = ballId.startsWith('F') ? MULTIPLIER_BALLS : LUCKY_BALLS;
                  const ball = balls.find(b => b.values.includes(numVal)) || balls.find(b => b.id === ballId);
                  if (ball) customBg = `bg-[#0a192f] border ${ball.border} ${ball.color}`;
                }

                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    draggable
                    onClick={() => handleCellClick(colIndex, rowIndex)}
                    onDragStart={(e) => handleDragStart(e, symbol, false, colIndex, rowIndex)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => handleDrop(e, colIndex, rowIndex)}
                    className={`
                      w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-xl font-bold
                      shadow-lg transform relative cursor-pointer active:scale-95 transition-all duration-200 shrink-0
                      ${customBg ? customBg :
                        symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed hover:border-dashboard-accent' :
                        symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                        symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                        'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30'}
                      ${isWinning ? `ring-2 z-10 scale-105 ${winColorClass}` : ''}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <span>{displaySymbol}</span>
                      {symbol.match(/^[F|L][1-4]_/) && (
                         <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none">{symbol.split('_')[0]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Trash Can Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={(e) => {
            e.preventDefault();
            const sourceColStr = e.dataTransfer.getData("sourceCol");
            const sourceRowStr = e.dataTransfer.getData("sourceRow");
            if (sourceColStr && sourceRowStr) {
               const sourceCol = parseInt(sourceColStr);
               const sourceRow = parseInt(sourceRowStr);
               const newGrid = gridSymbols.map(col => [...col]);
               newGrid[sourceCol][sourceRow] = '-';
               setGridSymbols(newGrid);
            }
          }}
          className="w-full mt-2 p-3 sm:p-4 border-2 border-dashed border-red-500/30 rounded-lg flex items-center justify-center text-red-500/50 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="mr-2" size={18} /> 
          <span className="text-sm font-bold">將符號拖曳至此刪除</span>
        </div>
      </div>

      {/* Right: RNG Output & Evaluation */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 max-h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-sm font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2">RNG 輸出結果</h2>
        
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400 font-bold">初始盤面 RNG:</span>
          <div className="flex items-center justify-between bg-[#112240] px-2 py-1.5 rounded border border-gray-700/50">
            <code className="text-xs text-yellow-400 font-mono truncate w-48" title={baseRngStr}>
              {baseRngStr}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(baseRngStr)}
              className="text-[10px] font-bold bg-[#0a192f] text-yellow-400 border border-yellow-400/50 px-2 py-0.5 rounded hover:bg-yellow-400 hover:text-[#0a192f] transition-colors cursor-pointer"
            >
              COPY
            </button>
          </div>
        </div>

        {winningCoords.size > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-orange-400 font-bold">消除數: {winningCoords.size}</span>
              <span className="text-[10px] text-gray-500 bg-[#112240] px-1 rounded border border-gray-700">防二次消除</span>
            </div>
            <span className="text-xs text-gray-400 font-bold">遞補 RNG:</span>
            <div className="flex items-center justify-between bg-[#112240] px-2 py-1.5 rounded border border-orange-500/30">
              <code className="text-xs text-[#64ffda] font-mono truncate w-48" title={dropRng}>
                {dropRng}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(dropRng)}
                className="text-[10px] font-bold bg-[#0a192f] text-[#64ffda] border border-[#64ffda]/50 px-2 py-0.5 rounded hover:bg-[#64ffda] hover:text-[#0a192f] transition-colors cursor-pointer"
              >
                COPY
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 pt-4 border-t border-gray-700/50 flex flex-col gap-2">
          <span className="text-xs text-dashboard-text-secondary font-bold mb-1">目前連線狀況</span>
          {wins.length > 0 ? wins.filter(w => w.totalWin > 0 || w.matchCount > 0).map((w, idx) => (
            <div key={idx} className="flex flex-col px-3 py-2 bg-[#112240] rounded border border-dashboard-accent/30">
              <span className="text-xs font-mono font-bold text-yellow-400">
                {w.symbolId} 連線 {w.matchCount}
              </span>
              <span className="text-[10px] font-mono text-gray-300 mt-0.5">
                payout: {w.payout} = <span className="font-bold text-dashboard-accent">{formatAmount(w.totalWin * betMultiplier)}</span>
              </span>
            </div>
          )) : (
            <div className="text-center text-xs text-gray-500 py-4">無贏分連線</div>
          )}
          {wins.length > 0 && (() => {
            let globalMultiplier = 0;
            gridSymbols.forEach(col => {
              col.forEach(sym => {
                if (sym.includes('_') && sym.match(/^[F|L][1-4]_/)) {
                  const valStr = sym.split('_')[1];
                  const num = parseInt(valStr.replace('X', ''), 10);
                  if (!isNaN(num)) globalMultiplier += num;
                }
              });
            });
            const finalMultiplier = globalMultiplier > 0 ? globalMultiplier : 1;
            const baseTotalWin = wins.reduce((sum, w) => sum + w.totalWin, 0) * betMultiplier;
            const grandTotalWin = baseTotalWin * finalMultiplier;
            
            return (
              <div className="mt-2 pt-3 border-t border-dashboard-accent/20 flex flex-col gap-1.5 px-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold text-[11px]">Base Win</span>
                  <span className="text-gray-300 font-bold text-xs">{formatAmount(baseTotalWin)}</span>
                </div>
                {globalMultiplier > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#64ffda] font-bold text-[11px]">Total Multiplier</span>
                    <span className="text-[#64ffda] font-bold text-xs">x{globalMultiplier}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white font-bold text-xs">Total Win</span>
                  <span className="text-dashboard-accent font-bold text-sm">{formatAmount(grandTotalWin)}</span>
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};
