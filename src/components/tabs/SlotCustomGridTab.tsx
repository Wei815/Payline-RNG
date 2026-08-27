import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import type { GameType, PaytableRule, GameConfig } from '../../types';
import { useGameStore, extractSpecialConfigFromGrid } from '../../store/useGameStore';
import { evaluateGrid } from '../../utils/evaluation';
import { formatAmount } from '../../utils/formatters';
import { calculateSVGPaths } from '../../utils/svgPaths';
import { getWinningPositions } from '../../utils/evaluation';
import type { SVGPathResult } from '../../utils/svgPaths';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';
import { SlotGridDisplay } from '../SlotGridDisplay';
import { useSnippetStore } from '../../store/useSnippetStore';

export interface SlotCustomGridTabProps {
  reelCount: number;
  rowCounts: number[];
  currentPaytable: PaytableRule[];
  groupedSymbols: { id: string, title: string, list: string[] }[];
  gameType: GameType;
  betMultiplier: number;
  customPaylines?: number[][];
  bet: number;
}

export const SlotCustomGridTab: React.FC<SlotCustomGridTabProps> = ({
  reelCount, rowCounts, currentPaytable, groupedSymbols, gameType, betMultiplier, customPaylines, bet
}) => {
  // --- States ---
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [linePaths, setLinePaths] = useState<SVGPathResult[]>([]);
  const [isGoldFrameMode, setIsGoldFrameMode] = useState(false);
  const goldFrames = useGameStore(state => state.customGridGoldFrames);
  const setGoldFrames = useGameStore(state => state.setCustomGridGoldFrames);
  const [isJackpotMode, setIsJackpotMode] = useState(false);
  const jackpots = useGameStore(state => state.customGridJackpots);
  const setJackpots = useGameStore(state => state.setCustomGridJackpots);
  const specialSymbolConfig = useGameStore(state => state.specialSymbolConfig);
  const setSpecialSymbolConfig = useGameStore(state => state.setSpecialSymbolConfig);
  const [selectedJackpot, setSelectedJackpot] = useState<'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>('MINI');
  const gridSymbols = useGameStore(state => state.customGridData);
  const setGridSymbols = useGameStore(state => state.setCustomGridData);
  const activeStripId = useGameStore(state => state.activeStripId);
  const setActiveStripId = useGameStore(state => state.setActiveStripId);
  const currentStripSets = useGameStore(state => state.currentStripSets);
  const currentFreeStripSets = useGameStore(state => state.currentFreeStripSets);
  const currentStrips = useGameStore(state => state.currentStrips);
  const isFreeGame = useGameStore(state => state.isFreeGame);

  const [hiddenPaletteSymbols, setHiddenPaletteSymbols] = useState<Set<string>>(new Set());
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(2);
  const [selectedPaletteSymbol, setSelectedPaletteSymbol] = useState<string | null>(null);

  const [rngInput, setRngInput] = useState('');
  const [classIdInput, setClassIdInput] = useState('');
  const [pastedStripIndices, setPastedStripIndices] = useState<number[] | null>(null);
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');

  const customGridData = useGameStore(state => state.customGridData);
  
  useEffect(() => {
    if (customGridData && customGridData.length > 0 && customGridData[0].length > 0) {
      setGridSymbols(customGridData);
    }
  }, [customGridData]);

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

  const mathIdToSymbol = useMemo(() => {
    const map: Record<number, string> = {};
    currentPaytable.forEach(r => {
      if (r.mathId !== undefined) {
        const ids = String(r.mathId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        ids.forEach(id => {
          map[id] = r.symbolId;
        });
      }
    });
    return map;
  }, [currentPaytable]);

  // Evaluate the grid
  const { wins, winningCoords, effectiveBet } = useMemo(() => {
    const effectiveBetValue = bet; // Use the actual total bet
    const config: GameConfig = {
      gameType,
      paylines: customPaylines || [],
      effectiveBet: effectiveBetValue,
      goldFrames,
      jackpots,
      specialRules: { derivativeSymbols: { 'B1': ['B2'] } }
    };
    const wins = evaluateGrid(gridSymbols, currentPaytable, config, undefined, true);
    const winningCoords = getWinningPositions(gridSymbols, wins, currentPaytable, gameType, undefined, customPaylines);
    return { wins, winningCoords, effectiveBet: effectiveBetValue };
  }, [gridSymbols, currentPaytable, gameType, customPaylines, betMultiplier, goldFrames, jackpots, bet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current) {
        const p = calculateSVGPaths(gridSymbols, wins, currentPaytable, gridContainerRef.current, 'custom', gameType, undefined, customPaylines);
        setLinePaths(p);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [gridSymbols, wins, currentPaytable, gameType, customPaylines]);

  useEffect(() => {
    const handleResize = () => {
      if (gridContainerRef.current) {
        const p = calculateSVGPaths(gridSymbols, wins, currentPaytable, gridContainerRef.current, 'custom', gameType, undefined, customPaylines);
        setLinePaths(p);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridSymbols, wins, currentPaytable, gameType, customPaylines]);

  // @ts-expect-error unused
  const handleTumble = () => {
    if (wins.length === 0) return;
    setGridSymbols(prevGrid => {
      const newGrid = prevGrid.map((col, c) => {
        const keptSymbols: string[] = [];
        for (let r = 0; r < col.length; r++) {
          if (!winningCoords.has(`${c}-${r}`)) {
            keptSymbols.push(col[r]);
          }
        }
        // Pad top with '-'
        const needed = col.length - keptSymbols.length;
        const padded = Array(needed).fill('-');
        return [...padded, ...keptSymbols];
      });
      return newGrid;
    });
    // Remove gold frames and jackpots for removed positions, and shift them down
    setGoldFrames(prev => {
      const next: Record<string, number> = {};
      Object.keys(prev).forEach(key => {
        const [cStr, rStr] = key.split('-');
        const c = Number(cStr);
        const r = Number(rStr);
        if (!winningCoords.has(key)) {
          // Calculate new row
          let shiftCount = 0;
          for (let row = r + 1; row < gridSymbols[c].length; row++) {
            if (winningCoords.has(`${c}-${row}`)) shiftCount++;
          }
          next[`${c}-${r + shiftCount}`] = prev[key];
        }
      });
      return next;
    });
    setJackpots(prev => {
      const next: Record<string, 'MINI'|'MAJOR'|'MEGA'|'MAXWIN'> = {};
      Object.keys(prev).forEach(key => {
        const [cStr, rStr] = key.split('-');
        const c = Number(cStr);
        const r = Number(rStr);
        if (!winningCoords.has(key)) {
          let shiftCount = 0;
          for (let row = r + 1; row < gridSymbols[c].length; row++) {
            if (winningCoords.has(`${c}-${row}`)) shiftCount++;
          }
          next[`${c}-${r + shiftCount}`] = prev[key];
        }
      });
      return next;
    });
  };

  const combinedClassIdStr = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(goldFrames), ...Object.keys(jackpots)]));
    if (keys.length === 0) return '';
    const output: number[] = [];
    
    // Sort by col, then row
    keys.sort((a, b) => {
      const [colA, rowA] = a.split('-').map(Number);
      const [colB, rowB] = b.split('-').map(Number);
      if (colA !== colB) return colA - colB;
      return rowA - rowB;
    });

    // Manual specified mapping for Gold Frames poolIndex
    const multiplierToPoolIndex: Record<number, number> = {
      2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 25: 9, 50: 10, 100: 11
    };
    
    const typeToId = { 'MINI': 12, 'MAJOR': 13, 'MEGA': 14, 'MAXWIN': 15 };

    keys.forEach(k => {
      const [col, row] = k.split('-').map(Number);
      
      if (goldFrames[k] !== undefined) {
        const val = goldFrames[k];
        const poolIndex = multiplierToPoolIndex[val] !== undefined ? multiplierToPoolIndex[val] : 0;
        output.push(col, row, poolIndex);
      }
      
      if (jackpots[k] !== undefined) {
        output.push(col, row, typeToId[jackpots[k]]);
      }
    });

    return `[${output.join(',')}]`;
  }, [goldFrames, jackpots]);

  // Multiplier ClassID String
  const multiplierClassIdStr = useMemo(() => {
    const classIdsArray: number[] = [];
    gridSymbols.forEach(col => {
      col.forEach(cell => {
        if (cell.includes('_') && cell.match(/^[F|L][1-4]_/)) {
          const val = parseInt(cell.split('_')[1].replace('X', ''), 10);
          if (!isNaN(val)) classIdsArray.push(val);
        }
      });
    });
    if (classIdsArray.length === 0) return '';
    return `[${classIdsArray.join(',')}],`;
  }, [gridSymbols]);

  // Handle Drag & Drops Generation
  const dropRng = useMemo(() => {
    if (gameType === 'linegame_set2' || gameType === 'linegame' || gameType.startsWith('waygame')) return '';
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
      let safeRule;
      safeRule = availableRules.find(r => (currentCounts[r.symbolId] || 0) < 6);
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
    if (pastedStripIndices) {
      return `[${pastedStripIndices.join(',')}],`;
    }

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
    
    // For Golden Elephant (and other waygames), the game server strictly expects a 6+1 format for RNG, so we discard the 30 math IDs.
    if (gameType.startsWith('waygame')) {
      const zeroes = Array(reelCount).fill(0);
      const activeStrips = isFreeGame ? currentFreeStripSets : currentStripSets;
      if (activeStrips && activeStrips.length > 1) {
        return `[${[...zeroes, activeStripId].join(',')}],`;
      }
      return `[${zeroes.join(',')}],`;
    }

    const activeStrips = isFreeGame ? currentFreeStripSets : currentStripSets;
    if (activeStrips && activeStrips.length > 1) {
      flatIds.push(activeStripId);
    }
    return `[${flatIds.join(',')}],`;
  }, [gridSymbols, symbolToMathId, activeStripId, currentStripSets, currentFreeStripSets, isFreeGame, gameType, reelCount, pastedStripIndices]);

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

    setPastedStripIndices(null);
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
    const key = `${colIndex}-${rowIndex}`;
    
    if (isGoldFrameMode) {
      setGoldFrames(prev => {
        const next = { ...prev };
        if (next[key] === selectedMultiplier) {
          delete next[key];
        } else {
          next[key] = selectedMultiplier;
        }
        return next;
      });
      // Remove jackpot at the same cell to prevent overlap
      setJackpots(prev => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    
    if (isJackpotMode) {
      setJackpots(prev => {
        const next = { ...prev };
        if (next[key] === selectedJackpot) {
          delete next[key];
        } else {
          next[key] = selectedJackpot;
        }
        return next;
      });
      // Remove gold frame at the same cell to prevent overlap
      setGoldFrames(prev => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    if (!selectedPaletteSymbol) return;
    const isSpecial = selectedPaletteSymbol.match(/^[F|L][1-4]/);
    const newSym = isSpecial ? `${selectedPaletteSymbol}_${selectedMultiplier}X` : selectedPaletteSymbol;
    
    const newGrid = gridSymbols.map(col => [...col]);
    newGrid[colIndex][rowIndex] = newSym;
    setGridSymbols(newGrid);
  };

  const handleLoadRng = () => {
    const matchRng = rngInput.match(/-?\d+/g);
    if (!matchRng) return;
    const ids = matchRng.map(s => parseInt(s, 10));
    if (ids.length === 0) return;
    
    const matchClass = classIdInput.match(/-?\d+/g);
    const classIds = matchClass ? matchClass.map(s => parseInt(s, 10)) : [];
    
    const isCoordinateClassId = gameType === 'linegame_set2' || gameType === 'linegame';
    const newGoldFrames: Record<string, number> = {};
    const newJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {};

    if (isCoordinateClassId && classIds.length > 0) {
      const poolIndexToMultiplier: Record<number, number> = {
        0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 25, 10: 50, 11: 100
      };
      const idToType: Record<number, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {
        12: 'MINI', 13: 'MAJOR', 14: 'MEGA', 15: 'MAXWIN'
      };

      for (let i = 0; i < classIds.length; i += 3) {
        const c = classIds[i];
        const r = classIds[i+1];
        const v = classIds[i+2];
        if (v !== undefined) {
          const key = `${c}-${r}`;
          if (v >= 0 && v <= 11) {
            newGoldFrames[key] = poolIndexToMultiplier[v];
          } else if (v >= 12 && v <= 15) {
            newJackpots[key] = idToType[v];
          }
        }
      }
      setGoldFrames(newGoldFrames);
      setJackpots(newJackpots);
    }



    if (ids.length === reelCount || ids.length === reelCount + 1) {
      // It's a strip indices array!
      const activeStrips = isFreeGame ? currentFreeStripSets : currentStripSets;
      let targetStripId = activeStripId;
      
      if (ids.length === reelCount + 1) {
         targetStripId = ids[reelCount];
         if (activeStrips && targetStripId >= 0 && targetStripId < activeStrips.length) {
            setActiveStripId(targetStripId);
         }
      }
      
      const stripsToUse = activeStrips && activeStrips.length > 1 ? activeStrips[targetStripId] : (isFreeGame && currentFreeStripSets && currentFreeStripSets.length > 0 ? currentFreeStripSets[0] : currentStrips);
      
      const stripGrid = Array.from({ length: reelCount }, (_, c) => {
        const rows = rowCounts[c] || 3;
        const strip = stripsToUse[c];
        const startIndex = ids[c];
        if (!strip || strip.length === 0) return Array(rows).fill('-');
        return Array.from({ length: rows }, (_, r) => strip[(startIndex + r) % strip.length]);
      });
      
      setGridSymbols(stripGrid);
      setPastedStripIndices(ids);
      setRngInput('');
      setClassIdInput('');
      return;
    }

    setPastedStripIndices(null);
    let idIndex = 0;
    let classIndex = 0;
    const newGrid = gridSymbols.map((col) => 
      col.map((cell) => {
        if (idIndex < ids.length) {
          const val = ids[idIndex++];
          let sym = mathIdToSymbol[val];
          if (sym && !isCoordinateClassId && sym.match(/^[F|L][1-4]/)) {
            const mult = classIds[classIndex++];
            if (mult !== undefined) {
              sym = `${sym}_${mult}X`;
            }
          }
          return sym ? sym : '-';
        }
        return cell;
      })
    );
    
    const newSpecialConfig = extractSpecialConfigFromGrid(newGrid, specialSymbolConfig, gameType);
    setSpecialSymbolConfig(newSpecialConfig);
    
    // redundant expectedCells check removed
    
    setGridSymbols(newGrid);
    setRngInput(''); // Clear input after load
    setClassIdInput('');
  };

  const handleReset = () => {
    setGridSymbols(Array.from({ length: reelCount }, (_, c) => 
      Array(rowCounts[c] || 3).fill('-')
    ));
    setPastedStripIndices(null);
    setGoldFrames({});
    setJackpots({});
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
      {!gameType.startsWith('waygame') && (
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 bg-[#0a192f] p-4 rounded-lg border border-gray-700/50 max-h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-sm font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2">方塊調色盤 (Palette)</h2>
        
        {/* Special Symbol Multiplier Config */}
        {gameType === 'linegame_set2' && (
          <div className="bg-[#112240] p-3 rounded-md border border-gray-700/50">
            <span className="text-xs text-dashboard-accent font-bold mb-2 block">特殊設定預設倍數:</span>
            <select 
              value={selectedMultiplier}
              onChange={e => setSelectedMultiplier(Number(e.target.value))}
              className="w-full bg-[#0a192f] border border-dashboard-accent/30 text-white rounded px-2 py-1 text-sm outline-none focus:border-dashboard-accent cursor-pointer mb-3"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 50, 100].map(m => (
                <option key={m} value={m}>{m}X</option>
              ))}
            </select>

            <button
              onClick={() => {
                const next = !isGoldFrameMode;
                if (next && gameType === 'linegame_set2') {
                  setIsJackpotMode(false);
                  setSelectedPaletteSymbol(null);
                }
                setIsGoldFrameMode(next);
              }}
              className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                isGoldFrameMode 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 ring-1 ring-yellow-400' 
                  : 'bg-[#0a192f] text-gray-400 border-gray-600 hover:border-gray-400'
              }`}
            >
              👑 金框編輯模式 {isGoldFrameMode ? '(ON)' : '(OFF)'}
            </button>

            <span className="text-xs text-red-400 font-bold mb-2 block mt-4">大獎設定:</span>
            <select 
              value={selectedJackpot}
              onChange={e => setSelectedJackpot(e.target.value as any)}
              className="w-full bg-[#0a192f] border border-red-500/30 text-white rounded px-2 py-1 text-sm outline-none focus:border-red-500 cursor-pointer mb-3"
            >
              <option value="MINI">MINI (25x)</option>
              <option value="MAJOR">MAJOR (100x)</option>
              <option value="MEGA">MEGA (500x)</option>
              <option value="MAXWIN">MAXWIN (20000x)</option>
            </select>
            <button
              onClick={() => {
                const next = !isJackpotMode;
                if (next && gameType === 'linegame_set2') {
                  setIsGoldFrameMode(false);
                  setSelectedPaletteSymbol(null);
                }
                setIsJackpotMode(next);
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
                  onClick={() => {
                    const next = selectedPaletteSymbol === symId ? null : symId;
                    if (next !== null && gameType === 'linegame_set2') {
                      setIsGoldFrameMode(false);
                      setIsJackpotMode(false);
                    }
                    setSelectedPaletteSymbol(next);
                  }}
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
      )}

      {/* Center: Grid */}
      <div className="flex-1 min-w-[300px] sm:min-w-[400px] flex flex-col items-center gap-4 bg-[#0a192f] p-4 sm:p-6 rounded-lg border border-gray-700/50 shadow-inner overflow-x-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full border-b border-gray-700/50 pb-2 gap-2">
          <span className="text-sm font-bold text-dashboard-text-secondary">編輯盤面區 (自由拖曳)</span>
          <div className="flex items-center gap-2 flex-wrap">
            {((isFreeGame ? currentFreeStripSets : currentStripSets) || []).length > 1 && (
              <div className="flex items-center gap-1 bg-[#112240] px-2 py-1 rounded border border-gray-700/50 mr-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Strip:</span>
                <select
                  value={activeStripId}
                  onChange={(e) => setActiveStripId(Number(e.target.value))}
                  className="bg-[#0a192f] border border-gray-600 text-dashboard-accent font-bold rounded px-1.5 py-0.5 text-xs outline-none focus:border-dashboard-accent cursor-pointer"
                >
                  {(isFreeGame ? currentFreeStripSets : currentStripSets)?.map((_, i) => (
                    <option key={i} value={i}>ID {i}</option>
                  ))}
                </select>
              </div>
            )}
            <input
              type="text"
              placeholder="貼上 RNG 陣列"
              value={rngInput}
              onChange={(e) => setRngInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadRng();
              }}
              className="bg-[#112240] border border-gray-600 text-white text-xs px-2 py-1 rounded w-32 sm:w-40 focus:border-dashboard-accent outline-none font-mono"
            />
            <input
              type="text"
              placeholder="貼上 ClassID 陣列"
              value={classIdInput}
              onChange={(e) => setClassIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadRng();
              }}
              className="bg-[#112240] border border-gray-600 text-white text-xs px-2 py-1 rounded w-32 sm:w-40 focus:border-dashboard-accent outline-none font-mono"
            />
            <button
               onClick={handleLoadRng}
               className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500 hover:text-white transition-colors whitespace-nowrap font-bold"
            >
              載入 RNG
            </button>
            <button 
              onClick={handleReset}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500 hover:text-white transition-colors whitespace-nowrap"
            >
              <RotateCcw size={12} />
              重置
            </button>
          </div>
        </div>
        
        <div 
          ref={gridContainerRef}
          className="flex justify-center items-center gap-3 bg-[#050b14] p-4 sm:p-6 rounded-xl border-2 border-gray-800 shadow-inner w-full overflow-x-auto custom-scrollbar relative"
        >
          {linePaths.length > 0 && (
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-20" style={{ minWidth: '100%', minHeight: '100%' }}>
              <defs>
                <filter id="glow-custom" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
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
                    d={p.path}
                    fill="none"
                    stroke="#64ffda"
                    strokeWidth="8"
                    strokeOpacity="0.45"
                    filter="url(#glow-custom)"
                  />
                  <path
                    d={p.path}
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

          <SlotGridDisplay
            gridMode="custom"
            gridSymbols={gridSymbols}
            winningCoords={winningCoords}
            onCellClick={handleCellClick}
            onDragStart={(e, symbol, colIndex, rowIndex) => handleDragStart(e, symbol, false, colIndex, rowIndex)}
            onDrop={handleDrop}
            goldFrames={goldFrames}
            jackpots={jackpots}
            renderCellInner={(symbol, _colIndex, _rowIndex, displaySymbol, hasGoldFrame, goldMultiplier, hasJackpot, jackpotValue) => (
              <div className="flex flex-col items-center justify-center pointer-events-none w-full h-full relative">
                <span>{displaySymbol}</span>
                {symbol.match(/^[F|L][1-4]_/) && (
                   <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none">{symbol.split('_')[0]}</span>
                )}
                {hasGoldFrame && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-[#0a192f] text-[10px] font-black px-1 rounded-sm shadow border border-yellow-600 z-10">
                    {goldMultiplier}
                  </div>
                )}
                {hasJackpot && (
                  <div className="absolute -bottom-1 left-0 right-0 mx-1 bg-red-500 text-white text-[9px] font-black px-1 rounded-sm shadow border border-red-700 z-10 truncate text-center">
                    {jackpotValue}
                  </div>
                )}
              </div>
            )}
          />
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
          {/* RNG Button */}
          <button
            onClick={() => {
              let text = `${baseRngStr}`;
              if (winningCoords.size > 0 && dropRng) text += `${dropRng}`;
              navigator.clipboard.writeText(text);
            }}
            className="w-full flex flex-col items-center justify-center gap-0.5 bg-[#112240] border border-gray-700/50 hover:border-[#64ffda] hover:bg-[#112240]/80 rounded p-2.5 cursor-pointer transition-all"
            title="點擊自動複製 RNG 腳本"
          >
             <span className="text-[#64ffda] text-xs font-mono leading-tight truncate max-w-full text-center" title={baseRngStr}>
               {baseRngStr.length > 30 ? baseRngStr.slice(0, 30) + '...],' : baseRngStr} (RNG)
             </span>
             {winningCoords.size > 0 && dropRng && (
               <span className="text-[#64ffda] text-xs font-mono leading-tight opacity-75 truncate max-w-full text-center" title={dropRng}>
                 {dropRng.length > 30 ? dropRng.slice(0, 30) + '...], (自動複製)' : dropRng.replace('],', '], (自動複製)')}
               </span>
             )}
          </button>

          {/* ClassID Button */}
          {(multiplierClassIdStr || combinedClassIdStr) && (
            <button
              onClick={() => {
                let text = '';
                if (multiplierClassIdStr) text += `${multiplierClassIdStr}`;
                if (combinedClassIdStr) text += `${combinedClassIdStr}`;
                navigator.clipboard.writeText(text);
              }}
              className="w-full flex flex-col items-center justify-center gap-0.5 bg-[#112240] border border-gray-700/50 hover:border-yellow-400 hover:bg-[#112240]/80 rounded p-2.5 cursor-pointer transition-all mt-1"
              title="點擊自動複製 ClassID"
            >
               {multiplierClassIdStr && (
                 <span className="text-purple-400 text-[10px] font-mono leading-tight opacity-75 truncate max-w-full text-center" title={multiplierClassIdStr}>
                   {multiplierClassIdStr.length > 30 ? multiplierClassIdStr.slice(0, 30) + '...' : multiplierClassIdStr} (ClassID)
                 </span>
               )}
               {combinedClassIdStr && (
                 <span className="text-yellow-400 text-[10px] font-mono leading-tight opacity-75 truncate max-w-full text-center" title={combinedClassIdStr}>
                   {combinedClassIdStr.length > 30 ? combinedClassIdStr.slice(0, 30) + '...' : combinedClassIdStr} (ClassID)
                 </span>
               )}
            </button>
          )}

          {/* Save to Snippet Button */}
          <button
            onClick={() => {
              setShowPrompt(true);
              setPromptTitle('');
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#1a365d] border border-blue-500/50 hover:border-blue-400 hover:bg-[#2a4365] rounded p-2.5 cursor-pointer transition-all mt-2"
          >
            <span className="text-blue-300 text-sm font-bold">💾 儲存至測試腳本庫</span>
          </button>
        </div>

        <div className="mt-2 pt-4 border-t border-gray-700/50 flex flex-col gap-2">
          <span className="text-xs text-dashboard-text-secondary font-bold mb-1">目前連線狀況</span>
          {wins.length > 0 ? wins.filter(w => w.totalWin > 0 || w.matchCount > 0).map((w, idx) => (
            <div key={idx} className="flex flex-col px-3 py-2 bg-[#112240] rounded border border-dashboard-accent/30">
              <span className="text-xs font-mono font-bold text-yellow-400">
                {w.symbolId} {w.matchCount > 0 && `連線 ${w.matchCount}`}
              </span>
              <span className="text-[10px] font-mono text-gray-300 mt-0.5">
                {w.isJackpot ? `${w.ways} × ${w.payout} × ${effectiveBet}` : `payout: ${w.payout}${w.multiplier ? ` × ${w.multiplier}` : ''}`} = <span className="font-bold text-dashboard-accent">{formatAmount(w.isJackpot ? w.totalWin : w.totalWin * betMultiplier)}</span>
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
            const baseTotalWin = wins.reduce((sum, w) => sum + (w.isJackpot ? w.totalWin : w.totalWin * betMultiplier), 0);
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
      {/* Custom Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a192f] border border-gray-700 w-full max-w-sm rounded-lg p-5 shadow-2xl">
            <h3 className="text-dashboard-text-primary font-bold mb-4">請輸入測試腳本名稱 (Title):</h3>
            <input 
              type="text" 
              autoFocus
              value={promptTitle}
              onChange={e => setPromptTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (promptTitle.trim() === '') return;
                  setShowPrompt(false);
                  
                  let rngData: number[][] = [];
                  let classIdData: number[][] = [];
                  let luckySelectData: number[][] = [];
                  let selectionData: number[][] = [];
    
                  try {
                    if (baseRngStr) {
                      let r = baseRngStr.replace(/,$/, '');
                      rngData = [JSON.parse(r)];
                    }
                  } catch (e) {
                    console.error("Failed to parse RNG", e);
                  }
    
                  try {
                    const classStr = multiplierClassIdStr || combinedClassIdStr;
                    if (classStr) {
                      let c = classStr.replace(/,$/, '');
                      classIdData = [JSON.parse(c)];
                    }
                  } catch (e) {
                    console.error("Failed to parse ClassID", e);
                  }
    
                  useSnippetStore.getState().addSnippet({
                    id: Date.now().toString(),
                    title: promptTitle.trim(),
                    gameType,
                    projectName: useGameStore.getState().projectName,
                    qaData: {
                      QA: [
                        {
                          RNGs: rngData,
                          ClassIDs: classIdData,
                          LuckySelects: luckySelectData,
                          Selection: selectionData
                        }
                      ]
                    },
                    createdAt: Date.now()
                  });
                }
              }}
              className="w-full bg-[#112240] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-dashboard-accent mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPrompt(false)} className="px-3 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">取消</button>
              <button 
                onClick={() => {
                  if (promptTitle.trim() === '') return;
                  setShowPrompt(false);
                  
                  let rngData: number[][] = [];
                  let classIdData: number[][] = [];
                  let luckySelectData: number[][] = [];
                  let selectionData: number[][] = [];
    
                  try {
                    if (baseRngStr) {
                      let r = baseRngStr.replace(/,$/, '');
                      rngData = [JSON.parse(r)];
                    }
                  } catch (e) {
                    console.error("Failed to parse RNG", e);
                  }
    
                  try {
                    const classStr = multiplierClassIdStr || combinedClassIdStr;
                    if (classStr) {
                      let c = classStr.replace(/,$/, '');
                      classIdData = [JSON.parse(c)];
                    }
                  } catch (e) {
                    console.error("Failed to parse ClassID", e);
                  }
    
                  useSnippetStore.getState().addSnippet({
                    id: Date.now().toString(),
                    title: promptTitle.trim(),
                    gameType,
                    projectName: useGameStore.getState().projectName,
                    qaData: {
                      QA: [
                        {
                          RNGs: rngData,
                          ClassIDs: classIdData,
                          LuckySelects: luckySelectData,
                          Selection: selectionData
                        }
                      ]
                    },
                    createdAt: Date.now()
                  });
                }} 
                disabled={!promptTitle.trim()}
                className="px-3 py-1.5 rounded text-sm bg-dashboard-accent text-[#0a192f] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
