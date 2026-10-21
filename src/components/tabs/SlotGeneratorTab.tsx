import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { GameType, PaytableRule, GameConfig } from '../../types';
import { formatAmount } from '../../utils/formatters';
import { getWinColorClass, calculateSVGPaths } from '../../utils/svgPaths';
import { getGameIntervals } from '../../utils/evaluation/GameIntervals';
import { getWinningPositions } from '../../utils/evaluation';
import { evaluateGrid } from '../../utils/evaluation';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../utils/evaluation/GameConstants';
import { useRngSearch } from '../../hooks/useRngSearch';
import { useGameStore } from '../../store/useGameStore';
import { GameRegistry } from '../../core/GameRegistry';
import { getScriptFormatter, getTraits } from '../../games/registry';
import { calculateCombinationWin as calcCombinationWin } from '../../flows/combinationWin';
import { getGameUi } from '../../games/ui-registry';
import { useLinePaths } from '../../hooks/useLinePaths';
import { symbolToneClass } from '../ui/symbolTone';
import type { ScriptContext } from '../../games/base/ScriptFormat';

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
  stripSets?: Record<string, string[][]>;
  setActiveStripId?: (id: number) => void;
}

export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({ stripSets, setActiveStripId,
  reelCount, rowCounts, onRowCountsChange,
  manualIndicesOther, setManualIndicesOther, topTrackerOther, setTopTrackerOther,
  gameType, betMultiplier,
  selectedSymbol, setSelectedSymbol,
  groupedSymbols, parsePasteRng, isRunning,
  specialSymbolConfig, setSpecialSymbolConfig,
  goldFrames, setGoldFrames, jackpots, setJackpots, clovers, setClovers,
  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame
}) => {
  const { setIsFreeGame } = useGameStore();
  const currentStripSets = useGameStore(state => state.currentStripSets);
  const gridContainerRefOther = useRef<HTMLDivElement>(null);

  const game = GameRegistry.tryGetGame(gameType);
  const gameUi = getGameUi(gameType);

  // 免遊觸發序列（遊戲實作 generateTriggerSequence 時啟用，例如羅馬）
  const [selectedTriggerCombo, setSelectedTriggerCombo] = useState<number>(4);
  const [triggerRngSequence, setTriggerRngSequence] = useState<number[][] | null>(null);
  const [isGeneratingTrigger, setIsGeneratingTrigger] = useState<boolean>(false);

  const regenerateTriggerSequence = useCallback(async () => {
    if (!game?.generateTriggerSequence) return;
    setIsGeneratingTrigger(true);
    try {
      const seq = await game.generateTriggerSequence(
        selectedTriggerCombo,
        currentStripSets,
        rowCounts,
        currentPaytable,
        customPaylines
      );
      setTriggerRngSequence(seq);
    } finally {
      setIsGeneratingTrigger(false);
    }
  }, [game, selectedTriggerCombo, currentStripSets, rowCounts, currentPaytable, customPaylines]);

  useEffect(() => {
    if (game?.generateTriggerSequence && isFreeGame) {
      regenerateTriggerSequence();
    }
  }, [game, isFreeGame, selectedTriggerCombo, regenerateTriggerSequence]);
  const [multiplierIntervals, setMultiplierIntervals] = useState<import('../../types').MultiplierInterval[]>(() => getGameIntervals(gameType));
  const [activeSearchIntervals, setActiveSearchIntervals] = useState<import('../../types').MultiplierInterval[]>(() => getGameIntervals(gameType));

  useEffect(() => {
    const initial = getGameIntervals(gameType);
    setMultiplierIntervals(initial);
    setActiveSearchIntervals(initial);
  }, [gameType]);

  const intervalErrors = useMemo(() => {
    return multiplierIntervals.map(interval => {
      const isMinNegative = interval.min < 0 || isNaN(interval.min);
      const isMaxNegative = interval.max !== null && (interval.max < 0 || isNaN(interval.max));
      const isMaxLessThanMin = interval.max !== null && !isNaN(interval.min) && !isNaN(interval.max) && interval.max < interval.min;
      
      let errorMsg = '';
      if (isMinNegative || isMaxNegative) {
        errorMsg = '數值不可為負數';
      } else if (isMaxLessThanMin) {
        errorMsg = `MAX (${interval.max}) 不能小於 MIN (${interval.min})`;
      }
      
      return {
        id: interval.id,
        isMinNegative,
        isMaxNegative,
        isMaxLessThanMin,
        hasError: Boolean(errorMsg),
        errorMsg
      };
    });
  }, [multiplierIntervals]);

  const hasAnyIntervalError = useMemo(() => {
    return intervalErrors.some(e => e.hasError);
  }, [intervalErrors]);

  const { isSearching, combinations } = useRngSearch(
    selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther, specialSymbolConfig, customPaylines, isFreeGame, bet, activeSearchIntervals, stripSets
  );

  let baseMultiplier = 1;
  if (getTraits(gameType).doublingTumbleMultiplier) {
    baseMultiplier = isFreeGame ? 8 : 1;
  }

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
    if (getTraits(gameType).family === 'megaway') {
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

        if (getTraits(gameType).family === 'payanywhere') {
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
    return getWinningPositions(displayGridOther, winsOther, currentPaytable, gameType, getTraits(gameType).family === 'megaway' ? topTrackerOther : undefined, customPaylines);
  }, [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther, customPaylines, bet]);

  // 禁忌 1：未選目標 Symbol 時絕不繪製連線
  const linePathsOther = useLinePaths(
    gridContainerRefOther,
    () => selectedSymbol
      ? calculateSVGPaths(displayGridOther, winsOther, currentPaytable, gridContainerRefOther.current, 'other', gameType, getTraits(gameType).family === 'megaway' ? topTrackerOther : undefined, customPaylines)
      : [],
    [displayGridOther, winsOther, currentPaytable, gameType, topTrackerOther, customPaylines, selectedSymbol],
  );

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
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);
  const [isCopiedAllTestCases, setIsCopiedAllTestCases] = useState<boolean>(false);

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
      let targetIdx = selectedCombIndex < combinations.length ? selectedCombIndex : 0;
      if (!combinations[targetIdx]?.rng) {
        const firstValidIdx = combinations.findIndex(c => c.rng !== null && c.rng !== undefined);
        if (firstValidIdx !== -1) {
          targetIdx = firstValidIdx;
          setSelectedCombIndex(firstValidIdx);
        }
      }
      const comb = combinations[targetIdx];
      if (comb && comb.rng) {
        setManualIndicesOther(comb.rng.map((val: any) => String(val)));
        setIsManualEdited(false);
        if ((comb as any).goldFrames !== undefined) {
          const gf = (comb as any).goldFrames || {};
          setGoldFrames(prev => (JSON.stringify(prev) === JSON.stringify(gf) ? prev : gf));
          setShowGoldFrameEditor(Object.keys(gf).length > 0);
        }
        if ((comb as any).jackpots !== undefined) {
          const jp = (comb as any).jackpots || {};
          setJackpots(prev => (JSON.stringify(prev) === JSON.stringify(jp) ? prev : jp));
          setShowJackpotEditor(Object.keys(jp).length > 0);
        }
        if ((comb as any).clovers !== undefined) {
          const cl = (comb as any).clovers || {};
          const hasClovers = Object.keys(cl).length > 0;
          setClovers(prev => (JSON.stringify(prev) === JSON.stringify(cl) ? prev : cl));
          setSpecialSymbolConfig(prev => (prev.s1Enabled === hasClovers ? prev : { ...prev, s1Enabled: hasClovers }));
        }
        if (comb.stripId !== undefined && setActiveStripId) {
          setActiveStripId(Number(comb.stripId));
        }
      }
    }
  }, [combinations, isSearching, setManualIndicesOther, selectedCombIndex, setGoldFrames, setJackpots, setClovers, setSpecialSymbolConfig, setShowGoldFrameEditor, setShowJackpotEditor]);

  const currentFormattedRngArray = useMemo(() => {
    let formattedRngArray: string[] = [];
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    const hasClovers = Object.keys(clovers).length > 0;
    
    const s1RawMathId = currentPaytable.find(p => p.symbolId === 'S1')?.mathId;
    const s1MathId = s1RawMathId ? String(s1RawMathId).split(',')[0].trim() : 'S1';
    
    if (getTraits(gameType).flatMathIdRng && (targetComb as any)?.fullMathIds && !isManualEdited && !hasClovers) {
      formattedRngArray = (targetComb as any).fullMathIds.slice(0, 30).map((id: number) => String(id));
    } else {
      let isFlatMathIdWithClovers = getTraits(gameType).flatMathIdRng && (targetComb as any)?.fullMathIds && !isManualEdited && hasClovers;
      if (isFlatMathIdWithClovers) {
        formattedRngArray = [...(targetComb as any).fullMathIds.slice(0, 30).map((id: number) => String(id))];
        Object.keys(clovers).forEach(key => {
          const [c, r] = key.split('-').map(Number);
          let flatIdx = 0;
          for(let i=0; i<c; i++) flatIdx += (rowCounts[i] || 3);
          flatIdx += r;
          formattedRngArray[flatIdx] = String(s1MathId);
        });
      } else {
        formattedRngArray = manualIndicesOther.slice(0, reelCount).map((colStr, cIdx) => {
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

  // 手動編輯盤面後的安全遞補 RNG（遊戲實作 findRefillRng 時啟用，例如羅馬）
  const manualRefillRng = useMemo(() => {
    if (!game?.findRefillRng || !isManualEdited || winsOther.length === 0) return null;
    try {
      return game.findRefillRng(displayGridOther, winsOther, currentPaytable, {
        stripSets: isFreeGame ? undefined : currentStripSets, fallbackStrips: currentStrips, rowCounts, paylines: customPaylines,
      });
    } catch {
      return null;
    }
  }, [game, isManualEdited, winsOther, currentStripSets, currentStrips, displayGridOther, currentPaytable, rowCounts, customPaylines, isFreeGame]);

  // QA 腳本格式由各遊戲 script.ts 決定（src/games/<遊戲>/script.ts）
  const scriptFormatter = getScriptFormatter(gameType);
  const scriptCtx: ScriptContext = {
    family: getTraits(gameType).family,
    isFreeGame,
    triggerRngSequence,
    selectedTriggerCombo,
    combinedClassIdStr,
    defaultStripId: stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0,
  };

  const currentRngString = scriptFormatter.currentRng({
    targetComb: combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0],
    formattedRngArray: currentFormattedRngArray,
    isManualEdited,
    manualSafeRng1: manualRefillRng,
  }, scriptCtx);

  // 「複製全部測案」的贏分公式在 src/flows/combinationWin.ts（依遊戲類別的掉落 / 倍數規則，有流程規則測試）
  const calculateCombinationWin = (comb: any) => calcCombinationWin({
    gameType, reelCount, rowCounts, currentStrips, stripSets, currentPaytable, customPaylines, bet, goldFrames,
    selectedSymbol, isFreeGame, topTrackerOther,
  }, comb);

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

  // 依分頁寬度（container query）決定特殊符號設定欄是否並排，避免側欄 / 設定面板展開時擠壓盤面
  return (
    <div className="@container w-full">
    {/* 工作台版面：寬時「盤面」與「組合清單」並排（.gen-layout 定義於 index.css），窄時單欄 */}
    <div className="gen-layout">
      <div className="gen-toolbar min-w-0 empty:hidden">
        <div className="w-full bg-dashboard-card rounded-xl border border-dashboard-border p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-dashboard-text-primary">目標符號</div>
              <div className="text-[11px] text-dashboard-text-muted">自動列出該符號在目前滾輪表的無干擾單一連線配置</div>
            </div>
            {gameUi.FreeGameToggle && <gameUi.FreeGameToggle isFreeGame={isFreeGame} setIsFreeGame={setIsFreeGame} />}
          </div>
          <div role="radiogroup" aria-label="目標符號" className="flex flex-wrap items-center gap-1.5">
            {groupedSymbols.map(group => {
              const filteredList = group.list.filter(sym => !['S1', 'S2', 'F1', 'L1'].includes(sym));
              if (filteredList.length === 0) return null;
              return (
                <div key={group.id} className="flex flex-wrap items-center gap-1.5 pr-2 mr-0.5 border-r border-dashboard-border last:border-r-0">
                  {filteredList.map(sym => {
                    const active = selectedSymbol === sym;
                    return (
                      <button
                        key={sym}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSelectedSymbol(sym)}
                        className={`h-8 min-w-[2.5rem] px-2 rounded-md text-[13px] font-semibold font-mono transition-all ${symbolToneClass(sym)} ${active ? 'ring-2 ring-dashboard-accent ring-offset-2 ring-offset-dashboard-card scale-105' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {[
              { id: 'COMBO', label: 'COMBO 連續消除' },
              { id: 'WIN_MULTIPLIER', label: '大獎區間' },
            ].map(opt => {
              const active = selectedSymbol === opt.id;
              return (
                <button
                  key={opt.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedSymbol(opt.id)}
                  className={`h-8 px-3 rounded-md text-[12px] font-medium border transition-colors ${active ? 'bg-dashboard-accent text-dashboard-on-accent border-dashboard-accent' : 'bg-dashboard-raised text-dashboard-text-secondary border-dashboard-border hover:text-dashboard-text-primary hover:bg-dashboard-hover'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* 保留原生下拉（隱藏），供鍵盤 / 自動化測試使用 */}
          <select
            aria-hidden="true"
            tabIndex={-1}
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="sr-only"
          >
            <option value="" disabled hidden>請選擇目標</option>
            {groupedSymbols.flatMap(g => g.list.filter(sym => !['S1', 'S2', 'F1', 'L1'].includes(sym))).map(sym => <option key={sym} value={sym}>{sym}</option>)}
            <option value="COMBO">COMBO (連續消除)</option>
            <option value="WIN_MULTIPLIER">大獎區間 (Win Multipliers)</option>
          </select>
        </div>
      </div>
      <div className="gen-trigger min-w-0 empty:hidden">
        {gameUi.TriggerPanel && game?.generateTriggerSequence && isFreeGame && (
          <gameUi.TriggerPanel
            selectedTriggerCombo={selectedTriggerCombo}
            setSelectedTriggerCombo={setSelectedTriggerCombo}
            triggerRngSequence={triggerRngSequence}
            isGeneratingTrigger={isGeneratingTrigger}
            regenerate={regenerateTriggerSequence}
          />
        )}
      </div>
      <div className="gen-intervals min-w-0 empty:hidden">
        {selectedSymbol === 'WIN_MULTIPLIER' && (
          <div className="w-full flex flex-col bg-dashboard-card p-4 rounded-xl border border-dashboard-border">
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
                  setActiveSearchIntervals([]);
                }}
                className="px-2 py-1 text-xs font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                + 新增區間
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 mb-3">
              {multiplierIntervals.map((interval, index) => {
                const errorInfo = intervalErrors[index];
                return (
                  <div
                    key={interval.id}
                    className={`flex flex-col gap-1.5 p-2.5 rounded border transition-colors ${
                      errorInfo?.hasError
                        ? 'bg-red-950/30 border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                        : 'bg-dashboard-card border-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={interval.name}
                        onChange={(e) => {
                          const newIntervals = [...multiplierIntervals];
                          newIntervals[index].name = e.target.value;
                          setMultiplierIntervals(newIntervals);
                          setActiveSearchIntervals([]);
                        }}
                        placeholder="區間名稱"
                        className="flex-1 bg-dashboard-bg border border-gray-600 text-dashboard-text-primary rounded px-2 py-1 outline-none focus:border-dashboard-accent text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Min:</span>
                        <input
                          type="number"
                          min={0}
                          value={isNaN(interval.min) ? '' : interval.min}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // 防呆：不可為負數，若輸入負數自動修正為 0
                            const num = raw === '' ? 0 : Number(raw);
                            const sanitized = Math.max(0, isNaN(num) ? 0 : num);
                            const newIntervals = [...multiplierIntervals];
                            newIntervals[index].min = sanitized;
                            setMultiplierIntervals(newIntervals);
                            setActiveSearchIntervals([]);
                          }}
                          className={`w-20 bg-dashboard-bg border ${
                            errorInfo?.isMinNegative || errorInfo?.isMaxLessThanMin
                              ? 'border-red-500 text-red-300 focus:border-red-400'
                              : 'border-gray-600 text-dashboard-text-primary focus:border-dashboard-accent'
                          } rounded px-2 py-1 outline-none text-sm`}
                        />
                      </div>
                      <span className="text-xs text-gray-400">~</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Max:</span>
                        <input
                          type="number"
                          min={0}
                          value={interval.max === null || isNaN(interval.max) ? '' : interval.max}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // 防呆：不可為負數，空值為無上限
                            let sanitized: number | null = null;
                            if (raw !== '') {
                              const num = Number(raw);
                              sanitized = Math.max(0, isNaN(num) ? 0 : num);
                            }
                            const newIntervals = [...multiplierIntervals];
                            newIntervals[index].max = sanitized;
                            setMultiplierIntervals(newIntervals);
                            setActiveSearchIntervals([]);
                          }}
                          placeholder="∞"
                          className={`w-20 bg-dashboard-bg border ${
                            errorInfo?.isMaxNegative || errorInfo?.isMaxLessThanMin
                              ? 'border-red-500 text-red-300 focus:border-red-400'
                              : 'border-gray-600 text-dashboard-text-primary focus:border-dashboard-accent'
                          } rounded px-2 py-1 outline-none text-sm`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newIntervals = [...multiplierIntervals];
                          newIntervals.splice(index, 1);
                          setMultiplierIntervals(newIntervals);
                          setActiveSearchIntervals([]);
                        }}
                        className="ml-1 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="刪除區間"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {errorInfo?.hasError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold px-1 animate-pulse">
                        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errorInfo.errorMsg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              disabled={isSearching || multiplierIntervals.length === 0 || hasAnyIntervalError}
              onClick={() => {
                if (hasAnyIntervalError) return;
                setActiveSearchIntervals([...multiplierIntervals]);
              }}
              className="w-full py-2 bg-dashboard-accent/20 text-dashboard-accent border border-dashboard-accent/50 rounded font-bold text-sm hover:bg-dashboard-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-dashboard-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  搜尋大獎區間中...
                </>
              ) : hasAnyIntervalError ? (
                '⚠️ 請修正無效區間 (MAX 需 ≥ MIN 且不可為負數)'
              ) : (
                '產生對應大獎 RNG'
              )}
            </button>
          </div>
        )}
      </div>
      <div className="gen-list @container min-w-0 empty:hidden">
        <div className="w-full flex flex-col bg-dashboard-card p-4 rounded-xl border border-dashboard-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700/50 pb-2 mb-3 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">
                連線組合清單 (點擊自動套用 RNG 盤面)
              </span>
              <button
                disabled={isSearching || combinations.length === 0}
                onClick={() => {
                  const sortedCombs = [...combinations].sort((a, b) => {
                    if (a.wildCount !== b.wildCount) return a.wildCount - b.wildCount;
                    return a.length - b.length;
                  });
                  const textToCopy = sortedCombs
                    .filter(c => c.rng && !c.isInterfered)
                    .map(c => scriptFormatter.copyAllLine(c, scriptCtx))
                    .join('\n');
                  navigator.clipboard.writeText(textToCopy);
                  setIsCopiedAll(true);
                  setTimeout(() => setIsCopiedAll(false), 2000);
                }}
                className={`px-2 py-1 text-xs font-bold rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCopiedAll 
                    ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                    : 'bg-dashboard-accent/10 hover:bg-dashboard-accent/20 text-dashboard-accent border-dashboard-accent/30'
                }`}
              >
                {isCopiedAll ? '✅ 已複製！' : '📋 複製全部腳本'}
              </button>
              <button
                disabled={isSearching || combinations.length === 0}
                onClick={() => {
                  const sortedCombs = [...combinations].sort((a, b) => {
                    if (a.wildCount !== b.wildCount) return a.wildCount - b.wildCount;
                    return a.length - b.length;
                  });
                  const items = sortedCombs
                    .map(c => {
                      if (!c.rng) {
                        return `${c.name}\t-\t-`;
                      }
                      const rngStr = scriptFormatter.testCaseRng(c, scriptCtx);
                      const winInfo = calculateCombinationWin(c);
                      return `${c.name}\t${rngStr}\t${winInfo.formula}`;
                    });
                    
                  if (items.length > 0) {
                    const textToCopy = items.join('\n');
                    navigator.clipboard.writeText(textToCopy);
                  }
                  setIsCopiedAllTestCases(true);
                  setTimeout(() => setIsCopiedAllTestCases(false), 2000);
                }}
                className={`px-2 py-1 text-xs font-bold rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCopiedAllTestCases 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                    : 'bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 border-blue-400/30'
                }`}
              >
                {isCopiedAllTestCases ? '✅ 已複製測案！' : '📋 複製全部測案'}
              </button>
              {gameUi.ExtraCopyButtons && (
                <gameUi.ExtraCopyButtons combinations={combinations} isSearching={isSearching} selectedSymbol={selectedSymbol} />
              )}
            </div>
            {isSearching && (
              <span className="text-xs text-yellow-400 font-mono animate-pulse">搜尋可能配置中...</span>
            )}
          </div>

          {(() => {
            // 分成兩組：純連線（wildCount=0）和含WX（wildCount>0）
            const pureCombinations = combinations.filter(c => c.wildCount === 0);
            const wxCombinations = combinations.filter(c => c.wildCount > 0);
            const maxRows = Math.max(pureCombinations.length, wxCombinations.length);

            const renderCombButton = (comb: typeof combinations[0], idx: number) => {
              const globalIdx = combinations.indexOf(comb);
              return (
                <button
                  key={globalIdx}
                  disabled={!comb.rng || isSearching}
                  onClick={() => {
                    setSelectedCombIndex(globalIdx);
                    if (comb.rng) {
                      setManualIndicesOther(comb.rng.map((val: any) => String(val)));
                      setIsManualEdited(false);
                      if ((comb as any).goldFrames !== undefined) {
                        const gf = (comb as any).goldFrames || {};
                        setGoldFrames(prev => (JSON.stringify(prev) === JSON.stringify(gf) ? prev : gf));
                        setShowGoldFrameEditor(Object.keys(gf).length > 0);
                      }
                      if ((comb as any).jackpots !== undefined) {
                        const jp = (comb as any).jackpots || {};
                        setJackpots(prev => (JSON.stringify(prev) === JSON.stringify(jp) ? prev : jp));
                        setShowJackpotEditor(Object.keys(jp).length > 0);
                      }
                      if ((comb as any).clovers !== undefined) {
                        const cl = (comb as any).clovers || {};
                        const hasClovers = Object.keys(cl).length > 0;
                        setClovers(prev => (JSON.stringify(prev) === JSON.stringify(cl) ? prev : cl));
                        setSpecialSymbolConfig(prev => (prev.s1Enabled === hasClovers ? prev : { ...prev, s1Enabled: hasClovers }));
                      }
                      if ((comb as any).stripId !== undefined && setActiveStripId) {
                        setActiveStripId(Number((comb as any).stripId));
                      }

                      navigator.clipboard.writeText(
                        isManualEdited && selectedCombIndex === globalIdx
                          ? currentRngString
                          : scriptFormatter.clickCopy(comb, scriptCtx),
                      );
                    }
                  }}
                  className={`flex justify-between items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                    selectedCombIndex === globalIdx ? 'ring-1 ring-dashboard-accent ' : ''
                  }${comb.rng
                      ? (comb.isInterfered || (comb as any).hasS1Drop)
                        ? 'bg-dashboard-card border-orange-500/40 hover:border-orange-500 text-dashboard-text-primary cursor-pointer'
                        : 'bg-dashboard-card border-gray-700/50 hover:border-dashboard-accent hover:bg-dashboard-card/80 text-dashboard-text-primary cursor-pointer'
                      : 'bg-dashboard-card/10 border-gray-800/50 text-gray-600 cursor-not-allowed'
                    }`}
                >
                  <span className="text-xs font-bold whitespace-pre-line shrink-0">{comb.name}</span>
                  {comb.rng ? (
                    <div className={`text-xs font-mono border bg-dashboard-bg px-1.5 py-0.5 rounded min-w-0 flex-1 truncate text-right ${(comb.isInterfered || (comb as any).hasS1Drop)
                        ? 'text-orange-400 border-orange-500/30'
                        : 'text-dashboard-accent border-dashboard-accent/30'
                      }`}>
                      {(() => {
                        const shown = scriptFormatter.display(comb, scriptCtx, selectedCombIndex === globalIdx && isManualEdited ? currentRngString : undefined);
                        if (shown.kind === 'mathIds') {
                          return (
                            <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                              <span className="text-dashboard-accent leading-tight truncate block" title={shown.mainTitle}>
                                {shown.main}
                              </span>
                              {shown.drop !== undefined && (shown.dropTitle !== undefined ? (
                                <span className="text-dashboard-accent leading-tight opacity-75 truncate block" title={shown.dropTitle}>
                                  {shown.drop}
                                </span>
                              ) : (
                                <span className="text-gray-400 leading-tight opacity-75 text-[10px] truncate block">
                                  {shown.drop}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        const rawStr = shown.raw;
                        const parts = rawStr.split('\t');
                        return (
                          <div className="flex flex-col w-full text-right gap-0.5">
                            <span className="truncate block leading-tight" title={rawStr}>{parts[0]}</span>
                            {parts[1] && (
                              <span className="truncate block opacity-80 text-[10.5px] leading-tight text-dashboard-accent" title={`Classid: ${parts[1].trim().replace(/,$/, '')}`}>
                                Classid: {parts[1].trim().replace(/,$/, '')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500 font-bold shrink-0">無可行滾輪位置</span>
                  )}
                </button>
              );
            };

            if (!selectedSymbol) {
              return (
                <div className="py-4 text-center text-xs text-gray-400 font-bold col-span-2">
                  請先從上方下拉選單選擇目標 Symbol
                </div>
              );
            }

            if (maxRows === 0 && !isSearching) {
              return (
                <div className="py-4 text-center text-xs text-gray-400 font-bold col-span-2">
                  {selectedSymbol === 'WIN_MULTIPLIER'
                    ? '參數已修改，請點擊上方「產生最大 RNG」重新產生結果'
                    : '沒有可用的 Symbol，請確認是否載入滾輪表 (Reel Strips)'}
                </div>
              );
            }

            if (wxCombinations.length === 0) {
              return (
                <div className="grid grid-cols-1 @[30rem]:grid-cols-2 gap-x-2 gap-y-1 @[30rem]:max-h-80 @[30rem]:overflow-y-auto pr-1">
                  {combinations.map((comb, i) => renderCombButton(comb, i))}
                </div>
              );
            }

            // 用兩個各自垂直的欄來展示：左欄純連線、右欄含WX
            return (
              <div className="grid grid-cols-1 @[30rem]:grid-cols-2 gap-x-2 gap-y-3 @[30rem]:max-h-80 @[30rem]:overflow-y-auto pr-1">
                {/* 純連線 */}
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold text-dashboard-text-muted px-0.5 pb-0.5">純連線</div>
                  {pureCombinations.map((comb, i) => renderCombButton(comb, i))}
                </div>
                {/* 含 WX */}
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold text-dashboard-text-muted px-0.5 pb-0.5">含 WX</div>
                  {wxCombinations.map((comb, i) => renderCombButton(comb, i))}
                </div>
              </div>
            );
          })()}
          {selectedSymbol && combinations.length === 0 && !isSearching && (
            <div className="py-4 text-center text-xs text-gray-400 font-bold col-span-2">
              {selectedSymbol === 'WIN_MULTIPLIER'
                ? '區間已修改，請點擊上方「產生對應大獎 RNG」按鈕產出組合'
                : '沒有可用的 Symbol，請確認是否載入滾輪表 (Reel Strips)'}
            </div>
          )}
        </div>
      </div>
      <div className="gen-settings min-w-0 empty:hidden">
        <div className="w-full flex flex-col bg-dashboard-card p-3 rounded-xl border border-dashboard-border gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-700/50 pb-3 gap-3">
            <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">滾輪位置 / RNG</span>
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
                className="bg-dashboard-card border border-gray-700 text-yellow-400 rounded px-2 py-1 outline-none focus:border-yellow-500 text-xs w-full placeholder:text-gray-600 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 items-end flex-1 pl-4">
              <div className="flex items-center gap-2 bg-dashboard-card px-2 py-1 rounded border border-gray-700/30 w-full justify-between">
                <span className="text-xs text-gray-400 font-bold shrink-0">RNG:</span>
                {(() => {
                  const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
                  const dropLength = winningCoordsOther.size;
                  const dropString = scriptFormatter.dropPreview(targetComb, dropLength);

                  return (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-1 w-full justify-between">
                        <code className="text-xs text-yellow-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={currentRngString}>
                          {(() => {
                            if (gameUi.CurrentRngPreview) {
                              const preview = gameUi.CurrentRngPreview({
                                targetComb,
                                formattedRngArray: currentFormattedRngArray,
                                isManualEdited,
                                manualRefillRng,
                                isFreeGame,
                                triggerRngSequence,
                                hasPayingWin: winsOther.some(w => (w.payout && w.payout > 0) || (w.totalWin && w.totalWin > 0)),
                              });
                              if (preview) return preview;
                            }
                            const parts = currentRngString.split('\t');
                            return (
                              <div className="flex flex-col">
                                <span>{parts[0]}</span>
                                {parts[1] && <span className="text-[10.5px] opacity-80 text-dashboard-accent leading-tight mt-0.5">Classid: {parts[1].trim().replace(/,$/, '')}</span>}
                              </div>
                            );
                          })()}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(currentRngString)}
                          className="text-[10px] font-bold bg-dashboard-bg text-dashboard-accent border border-dashboard-accent/50 px-1.5 py-0.5 rounded hover:bg-dashboard-accent hover:text-dashboard-bg transition-colors shrink-0 cursor-pointer"
                        >
                          COPY
                        </button>
                      </div>
                      {dropString && (
                        <div className="flex items-center gap-1 w-full justify-between mt-0.5 pt-1 border-t border-gray-700/50">
                          <span className="text-xs text-gray-400 font-bold shrink-0">遞補:</span>
                          <code className="text-xs text-dashboard-accent font-mono truncate max-w-[120px] sm:max-w-[250px]" title={dropString}>
                            {dropString}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(dropString)}
                            className="text-[10px] font-bold bg-dashboard-bg text-dashboard-accent border border-dashboard-accent/50 px-1.5 py-0.5 rounded hover:bg-dashboard-accent hover:text-dashboard-bg transition-colors shrink-0 cursor-pointer"
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
                  <div className="flex items-center gap-2 bg-dashboard-card px-2 py-1 rounded border border-gray-700/30 w-full justify-between">
                    <span className="text-xs text-gray-400 font-bold shrink-0">ClassIDs:</span>
                    <div className="flex items-center gap-1 overflow-hidden">
                      <code className="text-xs text-purple-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={classIdsString}>
                        {classIdsString}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(classIdsString)}
                        className="text-[10px] font-bold bg-dashboard-bg text-purple-400 border border-purple-400/50 px-1.5 py-0.5 rounded hover:bg-purple-400 hover:text-dashboard-bg transition-colors shrink-0 cursor-pointer"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {rowCounts.slice(0, reelCount).map((rows, idx) => (
              <div key={idx} className="flex flex-col justify-center items-center gap-1.5 py-2 px-2 bg-dashboard-card rounded-md border border-gray-700/50 shadow-sm hover:border-gray-600 transition-colors flex-1 min-w-[70px] max-w-[100px]">
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
                  className="bg-dashboard-bg border border-gray-600 text-dashboard-text-primary rounded px-1 py-0.5 outline-none focus:border-dashboard-accent text-[11px] cursor-pointer appearance-none text-center w-full"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>

              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="gen-board min-w-0 empty:hidden">
        <div
          className="slot-board bg-dashboard-card p-3 sm:p-6 rounded-xl shadow-2xl border border-gray-700/30 w-full overflow-hidden flex justify-center items-center"
        >
          <div ref={gridContainerRefOther} className="slot-grid relative inline-flex flex-col items-center justify-center" style={{ '--cols': reelCount } as React.CSSProperties}>
          {Boolean(selectedSymbol && linePathsOther.length > 0) && (
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
                      stroke={isInterference ? "#ef4444" : "var(--color-dashboard-accent)"}
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

          <div className="flex flex-col items-center justify-center slot-gap relative z-10 w-full">
            {getTraits(gameType).family === 'megaway' && (
              <div className="flex slot-gap justify-center mb-1">
                <div className="slot-cell bg-transparent" />
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
                        slot-cell rounded-lg flex flex-col items-center justify-center font-bold shadow-lg transform relative border
                        ${isWinning ? `scale-[1.06] border-2 shadow-[0_0_15px_rgba(100,255,218,0.85)] z-10 bg-dashboard-hover ${pulseClass} ${winColorClass}` : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : 'bg-dashboard-card text-dashboard-text-primary border-dashboard-accent/30'}
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
                        className="w-full text-center bg-transparent border-none outline-none text-base font-bold text-dashboard-text-primary uppercase focus:text-dashboard-accent"
                      />
                    </div>
                  );
                })}
                {reelCount > 5 && <div className="slot-cell bg-transparent" />}
              </div>
            )}

            <div className="flex justify-center items-center slot-gap">
              {displayGridOther.map((col, colIndex) => (
                <div key={colIndex} className="flex flex-col slot-gap">
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
                    if (symbol === 'S1' && getTraits(gameType).cloverCollection) {
                      displaySymbol = '🍀';
                    }
                    if (symbol.includes('_') && symbol.match(/^[F|L][1-4]_/)) {
                      const [ballId, valStr] = symbol.split('_');
                      displaySymbol = valStr;
                      const numVal = parseInt(valStr.replace('X', ''), 10);
                      const balls = ballId.startsWith('F') ? MULTIPLIER_BALLS : LUCKY_BALLS;
                      const ball = balls.find(b => b.values.includes(numVal)) || balls.find(b => b.id === ballId);
                      if (ball) {
                        customBg = `bg-dashboard-bg border ${ball.border} ${ball.color}`;
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
                          slot-cell rounded-lg flex items-center justify-center font-bold
                          shadow-lg transform relative cursor-grab active:cursor-grabbing
                          ${!isWinning && 'transition-all duration-300'}
                          ${customBg ? customBg : symbolToneClass(symbol)}
                          ${isWinning
                            ? `z-10 ring-2 scale-105 ${winColorClass} ${pulseClass} ${isNoPayoutWin ? 'ring-gray-400 shadow-[0_0_15px_rgba(156,163,175,0.8)]' : ''}`
                            : hasAnyWin
                              ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]'
                              : ''}
                        `}
                      >
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                          <span>{displaySymbol}</span>
                          {getTraits(gameType).cellMathIdLabel && manualIndicesOther[colIndex] && (() => {
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
                        {getTraits(gameType).goldFramesAndJackpots && showGoldFrameEditor && goldFrames[`${colIndex}-${rowIndex}`] !== undefined && (
                          <div className="absolute inset-0 rounded-lg border-[3px] border-yellow-400 pointer-events-none z-20 flex items-end justify-end p-0.5">
                            <span className="text-[9px] font-bold text-dashboard-bg bg-yellow-400 px-1 rounded-sm leading-tight shadow-sm">
                              {goldFrames[`${colIndex}-${rowIndex}`]}X
                            </span>
                          </div>
                        )}
                        {getTraits(gameType).goldFramesAndJackpots && showJackpotEditor && jackpots[`${colIndex}-${rowIndex}`] !== undefined && (
                          <div className="absolute inset-0 rounded-lg border-[3px] border-red-500 pointer-events-none z-20 flex items-end justify-end p-0.5">
                            <span className="text-[9px] font-bold text-dashboard-on-accent bg-red-500 px-1 rounded-sm leading-tight shadow-sm">
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
      </div>
      <div className="gen-eval min-w-0 empty:hidden">
        {/* Evaluation Output */}
        <div className="w-full flex flex-col bg-dashboard-card p-4 rounded-xl border border-dashboard-border">
          <span className="text-sm text-dashboard-text-secondary font-bold border-b border-gray-700/50 pb-2 mb-3">連線結果</span>

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
                    const isInterference = (selectedSymbol === 'WIN_MULTIPLIER' || selectedSymbol === 'COMBO')
                      ? false
                      : selectedSymbol === 'B1/B2' 
                      ? (w.symbolId !== 'B1' && w.symbolId !== 'B2')
                      : w.symbolId !== selectedSymbol;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col px-3 py-2 rounded border transition-all ${
                          isInterference
                            ? `bg-red-950/20 border-red-500/40 ${pulseClass}`
                            : 'bg-dashboard-card border-dashboard-accent/30'
                        }`}
                      >
                        <span className={`text-xs font-mono font-bold truncate ${isInterference ? 'text-red-400' : 'text-yellow-400'}`}>
                          {w.symbolId} {w.matchCount > 0 && (getTraits(gameType).family === 'payanywhere' ? `個數 ${w.matchCount}` : getTraits(gameType).family === 'line' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`)}
                          {isInterference && <span className="ml-1 text-[10px] opacity-80"> (干擾)</span>}
                        </span>
                        <span className={`text-xs font-mono mt-0.5 ${isInterference ? 'text-red-300' : 'text-gray-300'}`}>
                          {w.isJackpot ? `${w.ways} × ${w.payout} × ${bet}` : `${formatAmount(betMultiplier)} × ${w.payout}${w.ways > 1 ? ` × ${w.ways}` : ''}${w.multiplier ? ` × ${w.multiplier}` : ''}${baseMultiplier > 1 ? ` × ${baseMultiplier}` : ''}`} = <span className={`font-bold ${isInterference ? 'text-red-400' : 'text-dashboard-accent'}`}>{formatAmount(w.isJackpot ? w.totalWin : w.totalWin * betMultiplier * baseMultiplier)}</span>
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
                    const baseTotalWin = winHits.reduce((sum, w) => sum + (w.isJackpot ? w.totalWin : w.totalWin * betMultiplier * baseMultiplier), 0);
                    const grandTotalWin = baseTotalWin * finalMultiplier;
                    
                    return (
                      <div className="mt-1 pt-2 border-t border-dashboard-accent/20 flex flex-col gap-1 px-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold text-xs">Base Win</span>
                          <span className="text-gray-300 font-bold text-sm">{formatAmount(baseTotalWin)}</span>
                        </div>
                        {globalMultiplier > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-dashboard-accent font-bold text-xs">Total Multiplier</span>
                            <span className="text-dashboard-accent font-bold text-sm">x{globalMultiplier}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-dashboard-text-primary font-bold text-sm">Total Win</span>
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
                      <div key={idx} className="flex flex-col bg-dashboard-raised px-3 py-2 rounded border border-gray-700/30">
                        <span className="text-xs font-mono font-bold truncate text-gray-400">
                          {w.symbolId} {getTraits(gameType).family === 'payanywhere' ? `個數 ${w.matchCount}` : getTraits(gameType).family === 'line' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`}
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
      <div className="gen-special min-w-0 empty:hidden">
      {/* Right Column: Special Symbol & Multiplier Config */}
      {getTraits(gameType).family !== 'way' && (
      <div className="w-full bg-dashboard-card p-4 sm:p-5 rounded-xl border border-dashboard-border flex flex-col gap-4">
        <span className="text-base font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2 mb-1">特殊符號與倍數球配置</span>
        
        <div className="flex flex-col gap-4 p-4 bg-dashboard-card rounded border border-gray-700/50">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-purple-500/20">
              <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                {getTraits(gameType).goldFramesAndJackpots ? (
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
                <span className="text-base font-bold text-purple-400">{getTraits(gameType).goldFramesAndJackpots ? '啟用金框' : (getTraits(gameType).wyReels ? '啟用 WY/WZ' : '啟用 Scatter (S1/S2)')}</span>
              </label>
            </div>
            
            {getTraits(gameType).goldFramesAndJackpots && showGoldFrameEditor && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-dashboard-text-secondary">金框倍數 ID:</span>
                    <select 
                      value={selectedGoldMultiplier}
                      onChange={e => setSelectedGoldMultiplier(Number(e.target.value))}
                      className="bg-dashboard-bg border border-dashboard-accent/30 text-dashboard-text-primary rounded px-2 py-1 text-sm outline-none focus:border-dashboard-accent cursor-pointer"
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
                      : 'bg-dashboard-bg text-gray-400 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  👑 金框編輯模式 {isGoldFrameMode ? '(ON)' : '(OFF)'}
                </button>
              </div>
            )}

            {getTraits(gameType).goldFramesAndJackpots && (
              <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-red-500/20 mt-2">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  <input type="checkbox" className="accent-red-500 w-5 h-5" checked={showJackpotEditor}
                    onChange={(e) => setShowJackpotEditor(e.target.checked)} />
                  <span className="text-base font-bold text-red-400">啟用大獎 (Jackpot)</span>
                </label>
              </div>
            )}

            {getTraits(gameType).goldFramesAndJackpots && showJackpotEditor && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-dashboard-text-secondary">選擇大獎類型:</span>
                    <select 
                      value={selectedJackpot}
                      onChange={e => setSelectedJackpot(e.target.value as any)}
                      className="bg-dashboard-bg border border-red-500/30 text-dashboard-text-primary rounded px-2 py-1 text-sm outline-none focus:border-red-500 cursor-pointer"
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
                      : 'bg-dashboard-bg text-gray-400 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  🎯 大獎編輯模式 {isJackpotMode ? '(ON)' : '(OFF)'}
                </button>
              </div>
            )}

            {getTraits(gameType).goldFramesAndJackpots && (
              <>
              {combinedClassIdStr && (
                <div className="flex items-center gap-2 bg-dashboard-card px-2 py-1 rounded border border-gray-700/30 w-full justify-between mt-2">
                  <span className="text-xs text-yellow-400 font-bold shrink-0">ClassIDs:</span>
                  <div className="flex items-center gap-1 overflow-hidden">
                    <code className="text-xs text-yellow-400 font-mono truncate w-[85%]" title={combinedClassIdStr}>
                      {combinedClassIdStr}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(combinedClassIdStr)}
                      className="text-[10px] font-bold bg-dashboard-bg text-yellow-400 border border-yellow-400/50 px-1.5 py-0.5 rounded hover:bg-yellow-400 hover:text-dashboard-bg transition-colors shrink-0 cursor-pointer"
                    >
                      COPY
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
            
            {!getTraits(gameType).goldFramesAndJackpots && (specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {specialSymbolConfig.s1Enabled && (
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-purple-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                    <span className="text-sm font-bold text-purple-400">S1 (Scatter 1)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      <div className="flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                        <span className="text-sm text-purple-300 font-bold">數量</span>
                        <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                          value={specialSymbolConfig.s1Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s1Count: Number(e.target.value) }))}>
                          {[0, 1, 2, 3].map(n => (
                            <option key={n} value={n} className="bg-dashboard-card text-dashboard-text-primary">{n}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>
                )}
                {specialSymbolConfig.s2Enabled && (
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-purple-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                    <span className="text-sm font-bold text-purple-400">S2 (Scatter 2)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      <div className="flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                        <span className="text-sm text-purple-300 font-bold">數量</span>
                        <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                          value={specialSymbolConfig.s2Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s2Count: Number(e.target.value) }))}>
                          {[0, 1, 2, 3].map(n => (
                            <option key={n} value={n} className="bg-dashboard-card text-dashboard-text-primary">{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {(getTraits(gameType).cloverCollection || getTraits(gameType).multiplierBalls) && (
            <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-dashboard-accent/20">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  {getTraits(gameType).cloverCollection ? (
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
                  <span className="text-base font-bold text-dashboard-accent">{getTraits(gameType).cloverCollection ? '啟用幸運草' : '啟用倍數球 (F1~F4)'}</span>
                </label>
                {specialSymbolConfig.multipliersEnabled && !getTraits(gameType).cloverCollection && (() => {
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
              
              {getTraits(gameType).cloverCollection && specialSymbolConfig.s1Enabled && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-dashboard-accent/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-dashboard-accent"></div>
                    <span className="text-sm font-bold text-dashboard-accent">幸運草 (S1)</span>
                    <div className="flex flex-wrap gap-2 relative z-10">

                      <button
                        onClick={() => {
                          const next = !isCloverMode;
                          setIsCloverMode(next);
                          if (next) { setIsGoldFrameMode(false); setIsJackpotMode(false); }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                          isCloverMode 
                            ? 'bg-dashboard-accent/20 text-dashboard-accent border-dashboard-accent ring-1 ring-dashboard-accent' 
                            : 'bg-dashboard-card text-gray-400 border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        🍀 幸運草編輯模式 {isCloverMode ? '(ON)' : '(OFF)'}
                      </button>

                    </div>
                  </div>
                </div>
              )}
              
              {!getTraits(gameType).cloverCollection && specialSymbolConfig.multipliersEnabled && (() => {
                const totalMultipliers = Object.values(specialSymbolConfig.multiplierCounts).reduce((a, b) => a + b, 0);
                return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {MULTIPLIER_BALLS.map(ball => (
                    <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg ${ball.border} shadow-lg relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                      <div className="flex flex-wrap gap-2 relative z-10">
                        {ball.values.map(val => {
                          const key = `${ball.id}_${val}X`;
                          const count = specialSymbolConfig.multiplierCounts[key] || 0;
                          return (
                            <div key={val} className={`flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-dashboard-accent shadow-[0_0_8px_rgba(100,255,218,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                              <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-dashboard-accent' : 'text-gray-300'}`}>{val}X</span>
                              <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
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
                                  <option key={n} value={n} disabled={wouldExceed} className={`bg-dashboard-card ${wouldExceed ? 'text-gray-600' : 'text-dashboard-text-primary'}`}>
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

            {!getTraits(gameType).cloverCollection && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-pink-500/20">
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
                      <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg ${ball.border} shadow-lg relative overflow-hidden`}>
                        <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                        <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                        <div className="flex flex-wrap gap-2 relative z-10">
                          {ball.values.map(val => {
                            const key = `${ball.id}_${val}X`;
                            const count = specialSymbolConfig.luckyCounts[key] || 0;
                            return (
                              <div key={val} className={`flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                                <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-pink-400' : 'text-gray-300'}`}>{val}X</span>
                                <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
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
                                    <option key={n} value={n} disabled={wouldExceed} className={`bg-dashboard-card ${wouldExceed ? 'text-gray-600' : 'text-dashboard-text-primary'}`}>
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
    </div>
    </div>
  );
};