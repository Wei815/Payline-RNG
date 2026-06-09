import React, { useState, useEffect, useMemo } from 'react';
import { Play, Database, Table, Edit3, X } from 'lucide-react';
import type { ReelStrips, PaytableRule, GameType } from '../types';
import { defaultPaytable, defaultExcelStripsString } from '../mocks/defaultData';
import { defaultPaylines } from '../utils/evaluation';

interface ConfigPanelProps {
  isRunning: boolean;
  reelCount: number;
  onReelCountChange: (count: number) => void;
  rowCounts: number[];
  onTestSpin: (strips: ReelStrips, paytable: PaytableRule[], totalSpins?: number, rowCounts?: number[], paylines?: number[][]) => void;
  onConfigSync: (strips: ReelStrips, paytable: PaytableRule[]) => void;
  coin: number;
  onCoinChange: (coin: number) => void;
  gameType: GameType;
  onGameTypeChange: (type: GameType) => void;
  customPaylines: number[][];
  onPaylinesChange: (paylines: number[][]) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ isRunning, reelCount, onReelCountChange, rowCounts, onTestSpin, onConfigSync, coin, onCoinChange, gameType, onGameTypeChange, customPaylines, onPaylinesChange }) => {
  const [gridData, setGridData] = useState<string[][]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightSymbol, setHighlightSymbol] = useState<string>('');
  
  const [paytableMap, setPaytableMap] = useState<Record<string, PaytableRule>>(() => {
    const init: Record<string, PaytableRule> = {};
    defaultPaytable.forEach(rule => init[rule.symbolId] = rule);
    return init;
  });
  
  const [error, setError] = useState<string | null>(null);

  const isGridEmpty = gridData.length <= 4 && gridData.every(row => row.every(cell => !cell || cell.trim() === ''));

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    gridData.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.trim() !== '') symbols.add(cell.trim());
      });
    });
    return Array.from(symbols);
  }, [gridData]);

  const baseColumns = useMemo(() => {
    const bases = new Set<string>();
    uniqueSymbols.forEach(sym => {
      const s = sym.toUpperCase();
      if (s === 'WT' || s === 'WTE') bases.add('TE');
      else if (s === 'WN' || s === 'WNI') bases.add('NI');
      else if (/^W\d+$/.test(s)) bases.add(`M${s.substring(1)}`);
      else if (/^W[AKQJ]$/.test(s)) bases.add(s.substring(1));
      else bases.add(s); 
    });

    const order = ['WW', 'WX', 'B1', 'S1', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'A', 'K', 'Q', 'J', 'TE', 'NI'];
    const getOrder = (b: string) => {
       const idx = order.indexOf(b);
       return idx === -1 ? 999 : idx;
    };
    
    return Array.from(bases).sort((a, b) => getOrder(a) - getOrder(b));
  }, [uniqueSymbols]);

  const rowBlocks = useMemo(() => {
    // 0: Base, 1: W_Num, 2: W_Let
    const blocks: Record<string, string>[] = [{}, {}, {}]; 
    
    uniqueSymbols.forEach(sym => {
      const s = sym.toUpperCase();
      let base = s;
      let blockIdx = 0;

      if (/^W\d+$/.test(s)) {
        base = `M${s.substring(1)}`;
        blockIdx = 1;
      } else if (/^W(A|K|Q|J|T|TE|N|NI)$/.test(s)) {
        if (s === 'WT' || s === 'WTE') base = 'TE';
        else if (s === 'WN' || s === 'WNI') base = 'NI';
        else base = s.substring(1);
        blockIdx = 2;
      } else {
        base = s;
        blockIdx = 0;
      }

      blocks[blockIdx][base] = sym; 
    });
    return blocks;
  }, [uniqueSymbols]);

  const columnGroups = useMemo(() => {
    const others: string[] = [];
    const mNum: string[] = [];
    const mLet: string[] = [];

    baseColumns.forEach(base => {
      const b = base.toUpperCase();
      if (/^M\d+$/.test(b)) {
        mNum.push(base);
      } else if (['A','K','Q','J','T','TE','N','NI'].includes(b)) {
        mLet.push(base);
      } else {
        others.push(base);
      }
    });

    return [
      { id: 'others', title: '第一區塊 (其他)', bases: others },
      { id: 'mnum', title: '第二區塊 (M數字)', bases: mNum },
      { id: 'mlet', title: '第三區塊 (M字母)', bases: mLet }
    ].filter(g => g.bases.length > 0);
  }, [baseColumns]);

  useEffect(() => {
    setTimeout(() => {
      setPaytableMap(prev => {
        let changed = false;
        const newMap = { ...prev };
        uniqueSymbols.forEach(sym => {
          if (!newMap[sym]) {
            newMap[sym] = {
              symbolId: sym,
              name: sym,
              payouts: { match2: 0, match3: 0, match4: 0, match5: 0 },
              isWild: sym.toUpperCase().includes('W') || sym.toUpperCase().includes('WILD'),
              isScatter: sym.toUpperCase().includes('S') || sym.toUpperCase().includes('SCATTER')
            };
            changed = true;
          }
        });
        return changed ? newMap : prev;
      });
    }, 0);
  }, [uniqueSymbols]);

  useEffect(() => {
    if (gridData.length === 0) {
      setTimeout(() => setGridData(Array.from({ length: 4 }, () => Array(reelCount).fill(''))), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelCount]);

  useEffect(() => {
    try {
      const parsedStrips: ReelStrips = Array.from({ length: reelCount }, () => []);
      for (let rowIndex = 0; rowIndex < gridData.length; rowIndex++) {
        for (let colIndex = 0; colIndex < reelCount; colIndex++) {
          const val = gridData[rowIndex][colIndex];
          if (val && val.trim() !== '') {
            parsedStrips[colIndex].push(val.trim());
          }
        }
      }
      const finalPaytable = uniqueSymbols.map(sym => paytableMap[sym]).filter(Boolean);
      onConfigSync(parsedStrips, finalPaytable);
    } catch {
      // ignore empty catch
    }
  }, [gridData, paytableMap, uniqueSymbols, reelCount, onConfigSync]);

  const handleLoadDefaults = () => {
    handlePasteText(defaultExcelStripsString, reelCount);
    
    const init: Record<string, PaytableRule> = {};
    defaultPaytable.forEach(rule => init[rule.symbolId] = rule);
    setPaytableMap(init);

    // Load default paylines
    onPaylinesChange(defaultPaylines);
    
    setError(null);
  };

  const handlePasteText = (text: string, currentReelCount: number) => {
    const lines = text.trim().split(/\r?\n/);
    const newData: string[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split('\t');
      
      if (cols[0] && cols[0].toLowerCase().includes('line')) continue;
      if (cols[1] && cols[1].toLowerCase() === 'r1') continue;
      if (cols[0] && cols[0].toLowerCase() === 'r1') continue;

      const finalCols = cols.length < currentReelCount ? line.trim().split(/\s+/) : cols;

      if (finalCols.length >= currentReelCount + 1) {
        newData.push(finalCols.slice(1, currentReelCount + 1));
      } else if (finalCols.length >= currentReelCount) {
        newData.push(finalCols.slice(0, currentReelCount));
      }
    }

    if (newData.length > 0) {
      setGridData(newData);
      setError(null);
    } else {
      setError(`無法解析資料。請確保貼上的內容包含 ${currentReelCount} 個欄位。`);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('Text');
    handlePasteText(text, reelCount);
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const onPastePaylines = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('Text');
    
    const lines = text.trim().split(/\r?\n/);
    const newLines: number[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split('\t').map(s => s.trim()).filter(s => s !== '');
      
      // 跳過標頭 (No., Line, R1...)
      if (cols[0] && (cols[0].toLowerCase().includes('no') || cols[0].toLowerCase().includes('line'))) continue;
      if (cols[0] && cols[0].toLowerCase().startsWith('r1')) continue;

      const finalCols = cols.length < reelCount ? line.trim().split(/\s+/).map(s => s.trim()) : cols;

      if (finalCols.length >= reelCount + 1) {
        const rowVals = finalCols.slice(1, reelCount + 1).map(Number);
        if (rowVals.every(n => !isNaN(n))) {
          newLines.push(rowVals);
        }
      } else if (finalCols.length >= reelCount) {
        const rowVals = finalCols.slice(0, reelCount).map(Number);
        if (rowVals.every(n => !isNaN(n))) {
          newLines.push(rowVals);
        }
      }
    }

    if (newLines.length > 0) {
      onPaylinesChange(newLines);
      setError(null);
    } else {
      setError(`無法解析線路規則。請確保貼上的內容包含 ${reelCount} 個滾輪欄位。`);
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const updatePaytableProperty = (sym: string, prop: 'isWild' | 'isScatter', value: boolean) => {
    setPaytableMap(prev => ({
      ...prev,
      [sym]: { ...prev[sym], [prop]: value }
    }));
  };

  const updatePaytablePayout = (sym: string, matchKey: keyof PaytableRule['payouts'], value: number) => {
    setPaytableMap(prev => ({
      ...prev,
      [sym]: {
        ...prev[sym],
        payouts: {
          ...prev[sym].payouts,
          [matchKey]: value
        }
      }
    }));
  };

  const handleTestSpin = () => {
    try {
      setError(null);
      
      const parsedStrips: ReelStrips = Array.from({ length: reelCount }, () => []);
      for (let rowIndex = 0; rowIndex < gridData.length; rowIndex++) {
        for (let colIndex = 0; colIndex < reelCount; colIndex++) {
          const val = gridData[rowIndex][colIndex];
          if (val && val.trim() !== '') {
            parsedStrips[colIndex].push(val.trim());
          }
        }
      }

      const emptyReels = parsedStrips.findIndex(strip => strip.length === 0);
      if (emptyReels !== -1) {
        throw new Error(`R${emptyReels + 1} 沒有任何資料，請檢查表格內容。`);
      }

      const finalPaytable = uniqueSymbols.map(sym => paytableMap[sym]).filter(Boolean);

      onTestSpin(parsedStrips, finalPaytable, 50, rowCounts, customPaylines);
    } catch (e: any) {
      setError('執行錯誤：' + e.message);
    }
  };

  const renderRowGroup = (
    bases: string[], 
    title: string, 
    getSym: (base: string) => string | undefined,
    bgColor: string
  ) => {
    return (
      <React.Fragment>
        <tr className={bgColor}>
          <td rowSpan={5} className="border-r border-b border-gray-700 p-2 font-bold text-dashboard-accent text-center bg-[#0f1d35] whitespace-pre-wrap w-24">
            {title}
          </td>
          <td className="border-r border-b border-gray-700 p-1 font-bold text-gray-500 w-16 bg-[#0f1d35]">
            Sym
          </td>
          {bases.map(base => {
            const sym = getSym(base);
            if (!sym) return <td key={base} className="border-none bg-transparent"></td>;
            
            return (
              <td key={base} className="border-r border-b border-t border-gray-700 p-2 h-[56px] bg-[#112240] shadow-sm relative">
                <div className="flex items-center justify-center gap-2.5">
                  <div className="text-dashboard-text-primary text-[15px] font-bold min-w-[20px] text-center">{sym}</div>
                  <div className="flex flex-col gap-1 text-xs text-dashboard-text-secondary font-sans font-normal border-l border-gray-700/50 pl-2.5">
                    <label className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-yellow-400 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={paytableMap[sym]?.isWild || false}
                        onChange={(e) => updatePaytableProperty(sym, 'isWild', e.target.checked)}
                        className="accent-yellow-500 w-2.5 h-2.5 cursor-pointer"
                      /> Wild
                    </label>
                    <label className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-purple-400 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={paytableMap[sym]?.isScatter || false}
                        onChange={(e) => updatePaytableProperty(sym, 'isScatter', e.target.checked)}
                        className="accent-purple-500 w-2.5 h-2.5 cursor-pointer"
                      /> Scatter
                    </label>
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
        
        {[5, 4, 3, 2].map(match => {
          let labelText = String(match);
          if (gameType === 'payanywhere') {
            if (match === 5) labelText = '>=12';
            else if (match === 4) labelText = '10-11';
            else if (match === 3) labelText = '8-9';
            else if (match === 2) labelText = '<8';
          }
          return (
            <tr key={match} className={`hover:bg-[#1a2b4c] transition-colors ${bgColor}`}>
              <td className="border-r border-b border-gray-700 p-2 font-bold text-dashboard-text-secondary bg-[#0f1d35] shadow-sm">
                {labelText}
              </td>
              {bases.map(base => {
                const sym = getSym(base);
                if (!sym) return <td key={base} className="border-none bg-transparent h-[40px]"></td>;
                
                const val = paytableMap[sym]?.payouts[`match${match}` as keyof PaytableRule['payouts']];
                return (
                  <td key={base} className="border-r border-b border-gray-700 p-0 h-[40px] min-w-[110px] bg-[#0a192f]">
                    <input 
                      type="number"
                      min="0"
                      value={val === 0 ? '' : val}
                      placeholder="--"
                      onChange={(e) => updatePaytablePayout(sym, `match${match}` as keyof PaytableRule['payouts'], parseInt(e.target.value) || 0)}
                      onPaste={(e) => {
                        const pasteData = e.clipboardData.getData('text');
                        const nums = pasteData.trim().split(/[\s,]+/);
                        if (nums.length > 1) {
                          e.preventDefault();
                          let numIdx = 0;
                          for (let m = match; m >= 2 && numIdx < nums.length; m--) {
                            const parsedVal = parseInt(nums[numIdx], 10);
                            if (!isNaN(parsedVal)) {
                              updatePaytablePayout(sym, `match${m}` as keyof PaytableRule['payouts'], parsedVal);
                            }
                            numIdx++;
                          }
                        }
                      }}
                      className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-[#1a2b4c] focus:text-dashboard-accent text-dashboard-text-primary transition-colors text-sm"
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="h-full bg-dashboard-card p-4 flex flex-col gap-4 border-r border-gray-700/50 relative">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dashboard-text-primary">Configuration</h2>
        <button 
          onClick={handleLoadDefaults}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-900/40 text-blue-300 hover:bg-blue-800/50 rounded-md transition-colors disabled:opacity-50"
        >
          <Database size={16} /> Load Defaults
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        
        <div className={`flex flex-col gap-2 ${gameType === 'linegame' ? 'h-[220px] shrink-0' : 'flex-1 min-h-[300px]'}`}>
          <div className="flex flex-col gap-2 border-b border-gray-800/60 pb-3">
            {/* Row 1: Title & Main Dropdowns */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-dashboard-text-secondary font-bold whitespace-nowrap">Reel Strips 表格</label>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium whitespace-nowrap">Game Type:</span>
                  <select
                    value={gameType}
                    onChange={(e) => onGameTypeChange(e.target.value as GameType)}
                    disabled={isRunning}
                    className="bg-[#0f1d35] border border-gray-700 text-dashboard-accent rounded px-2 py-1 outline-none focus:border-dashboard-accent cursor-pointer text-xs font-bold font-mono"
                  >
                    <option value="waygame">Way</option>
                    <option value="megaway">Megaways</option>
                    <option value="payanywhere">Pay Anywhere</option>
                    <option value="linegame">Line</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium">Reels:</span>
                  <select 
                    value={reelCount}
                    onChange={(e) => {
                      const newCount = Number(e.target.value);
                      onReelCountChange(newCount);
                      setGridData(Array.from({ length: 4 }, () => Array(newCount).fill('')));
                    }}
                    disabled={isRunning}
                    className="bg-[#0f1d35] border border-gray-700 text-dashboard-accent rounded px-2 py-1 outline-none focus:border-dashboard-accent cursor-pointer text-xs font-bold font-mono"
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: Secondary Filters/Inputs */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-[#112240] px-2 py-1 rounded border border-gray-700/50 focus-within:border-dashboard-accent transition-colors">
                <span className="text-xs text-gray-400 font-bold whitespace-nowrap">Highlight:</span>
                <input 
                  type="text"
                  value={highlightSymbol}
                  onChange={(e) => setHighlightSymbol(e.target.value)}
                  placeholder="Sym"
                  disabled={isRunning}
                  className="bg-transparent border-none outline-none text-dashboard-accent font-bold text-xs w-10 text-center uppercase"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[#112240] px-2 py-1 rounded border border-gray-700/50">
                <span className="text-gray-400 font-bold whitespace-nowrap">Coin:</span>
                <input 
                  type="number"
                  min="1"
                  value={coin}
                  onChange={(e) => onCoinChange(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isRunning}
                  className="bg-transparent border-none outline-none text-dashboard-accent font-bold text-xs w-8 text-center font-mono"
                />
              </div>
            </div>
          </div>

          <div 
            className="flex-1 border border-gray-700 rounded-lg overflow-hidden flex flex-col bg-[#0a192f] focus-within:ring-1 focus-within:ring-dashboard-accent focus-within:border-dashboard-accent transition-all relative"
            tabIndex={0}
            onPaste={isRunning ? undefined : onPaste}
          >
            <div className="flex bg-[#0f1d35] text-xs font-bold text-dashboard-text-secondary border-b border-gray-700 select-none">
              <div className="w-12 py-2 text-center border-r border-gray-700">Line #</div>
              {Array.from({ length: reelCount }).map((_, i) => (
                <div key={i} className="flex-1 py-2 text-center border-r border-gray-700/50 last:border-r-0">
                  R{i + 1}
                </div>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-center text-xs font-mono">
                <tbody className="divide-y divide-gray-800/50">
                  {gridData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-[#112240] transition-colors">
                      <td className="w-12 py-1.5 bg-[#112240] text-gray-500 border-r border-gray-700 select-none">
                        {rowIndex}
                      </td>
                      {row.map((cell, colIndex) => {
                        const isMatch = highlightSymbol && cell && cell.trim().toUpperCase() === highlightSymbol.trim().toUpperCase();
                        return (
                          <td 
                            key={colIndex} 
                            className={`py-1.5 px-1 border-r border-gray-700/50 last:border-r-0 break-all transition-colors ${
                              isMatch ? 'bg-dashboard-accent/20 text-dashboard-accent font-bold outline outline-1 outline-dashboard-accent/50 z-10 relative' : 'text-dashboard-text-primary'
                            }`}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isGridEmpty && !isRunning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-[2px] z-10">
                <div className="bg-[#112240] border border-dashboard-accent text-dashboard-accent px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 font-medium text-sm">
                  <Table size={18} /> 點擊此處並按 Ctrl+V 貼上
                </div>
              </div>
            )}
          </div>
        </div>

        {gameType === 'linegame' && (
          <div className="flex flex-col gap-2 h-[220px] shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-sm text-dashboard-text-secondary font-medium">線路規則 表格 (Line Rules)</label>
              <span className="text-xs text-dashboard-text-secondary font-mono">已載入 {customPaylines.length} 條線</span>
            </div>
            <div 
              className="flex-1 border border-gray-700 rounded-lg overflow-hidden flex flex-col bg-[#0a192f] focus-within:ring-1 focus-within:ring-dashboard-accent focus-within:border-dashboard-accent transition-all relative"
              tabIndex={0}
              onPaste={isRunning ? undefined : onPastePaylines}
            >
              <div className="flex bg-[#0f1d35] text-xs font-bold text-dashboard-text-secondary border-b border-gray-700 select-none">
                <div className="w-12 py-2 text-center border-r border-gray-700">No.</div>
                {Array.from({ length: reelCount }).map((_, i) => (
                  <div key={i} className="flex-1 py-2 text-center border-r border-gray-700/50 last:border-r-0">
                    R{i + 1}
                  </div>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-center text-xs font-mono">
                  <tbody className="divide-y divide-gray-800/50">
                    {customPaylines.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-[#112240] transition-colors">
                        <td className="w-12 py-1.5 bg-[#112240] text-gray-500 border-r border-gray-700 select-none">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, colIndex) => (
                          <td 
                            key={colIndex} 
                            className="py-1.5 px-1 border-r border-gray-700/50 last:border-r-0 text-dashboard-text-primary"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {customPaylines.length === 0 && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-[2px] z-10">
                  <div className="bg-[#112240] border border-dashboard-accent text-dashboard-accent px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 font-medium text-sm">
                    <Table size={18} /> 點擊此處並按 Ctrl+V 貼上線規則
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-sm text-dashboard-text-secondary font-medium">Paytable Rules</label>
          <div className="bg-[#0f1d35] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-dashboard-text-primary font-bold">動態賠率表</span>
              <span className="text-gray-500 text-xs mt-1">
                已提取 {uniqueSymbols.length} 個獨特符號
              </span>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={isRunning || uniqueSymbols.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#112240] border border-dashboard-accent text-dashboard-accent rounded-lg hover:bg-dashboard-accent hover:text-[#0a192f] transition-all font-bold text-sm disabled:opacity-50 disabled:hover:bg-[#112240] disabled:hover:text-dashboard-accent disabled:cursor-not-allowed"
            >
              <Edit3 size={16} /> 開啟編輯器
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded break-words">
          {error}
        </div>
      )}

      <button
        onClick={handleTestSpin}
        disabled={isRunning || isGridEmpty}
        className="mt-auto w-full py-3 flex items-center justify-center gap-2 bg-[#112240] border border-dashboard-accent text-dashboard-accent font-bold rounded-lg hover:bg-dashboard-accent hover:text-[#0a192f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Spinning...
          </>
        ) : (
          <>
            <Play size={20} fill="currentColor" /> Test Spin (單次試轉)
          </>
        )}
      </button>

      {/* Paytable Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="bg-[#0a192f] border border-gray-600 w-full max-w-7xl h-full max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#0f1d35] shrink-0">
              <div className="flex items-center gap-3">
                <Table className="text-dashboard-accent" />
                <h2 className="text-xl font-bold text-dashboard-text-primary tracking-wide">Paytable Editor</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 lg:p-10 custom-scrollbar bg-dashboard-bg">
              <div className="flex flex-col gap-10 pb-10 max-w-[100%] mx-auto">
                {columnGroups.map(group => {
                  const hasWilds = group.bases.some(base => rowBlocks[1][base] || rowBlocks[2][base]);
                  
                  return (
                    <div key={group.id} className="flex flex-col gap-3">
                      <h3 className="text-dashboard-accent font-bold text-lg px-1">{group.title}</h3>
                      <div className="overflow-x-auto rounded-lg shadow-xl border border-gray-700 bg-[#0a192f]">
                        <table className="w-full text-center text-xs font-mono border-collapse table-auto">
                          <thead className="bg-[#0f1d35]">
                            <tr>
                              <th className="p-3 border-b border-r border-gray-700 w-24 font-bold text-dashboard-text-secondary">Type</th>
                              <th className="p-3 border-b border-r border-gray-700 w-16 font-bold text-dashboard-text-secondary">Hits</th>
                              {group.bases.map(base => (
                                <th key={base} className="p-3 border-b border-r border-gray-700 min-w-[110px] text-dashboard-text-secondary font-bold uppercase tracking-wider">
                                  {base}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/50">
                            {renderRowGroup(group.bases, 'Base\\Free', (base) => rowBlocks[0][base], 'bg-blue-900/10')}
                            {hasWilds && renderRowGroup(group.bases, 'Wilds', (base) => rowBlocks[1][base] || rowBlocks[2][base], 'bg-purple-900/10')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
