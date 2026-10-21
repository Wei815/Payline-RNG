import React from 'react';
import { evaluateGrid } from '../../utils/evaluation';
import { formatAmount } from '../../utils/formatters';
import type { GameType, PaytableRule } from '../../types';
import { GameRegistry } from '../../core/GameRegistry';
import { symbolToneClass } from '../ui/symbolTone';
import { getTraits } from '../../games/registry';

export interface LineViewerTabProps {
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  stripSets?: Record<string, string[][]>;
  activeLineViewerSymbol: string;
  setLineViewerSymbolState: (val: string) => void;
  symbols: string[];
  useWxInLines: boolean;
  setUseWxInLines: (val: boolean) => void;
  lineViewerPayout: number;
  betMultiplier: number;
  customPaylines?: number[][];
  defaultPaylines: number[][];
  setManualIndices: (val: string[]) => void;
  setManualIndicesOther: (val: string[]) => void;
  copiedIndex: number | null;
  setCopiedIndex: (val: number | null) => void;
  currentPaytable: PaytableRule[];
  gameType: GameType;
}

export const LineViewerTab: React.FC<LineViewerTabProps> = ({
  reelCount, rowCounts, currentStrips, stripSets, activeLineViewerSymbol, setLineViewerSymbolState,
  symbols, useWxInLines, setUseWxInLines, lineViewerPayout, betMultiplier,
  customPaylines, defaultPaylines, setManualIndices, setManualIndicesOther,
  copiedIndex, setCopiedIndex, currentPaytable, gameType
}) => {
  const [isCopiedAll, setIsCopiedAll] = React.useState(false);
  
  const linesToRender = customPaylines && customPaylines.length > 0 ? customPaylines : defaultPaylines;

  const computedLines = React.useMemo(() => {
    // 需要「初始 + 遞補」連鎖腳本的遊戲（例如羅馬）
    const refillGame = GameRegistry.tryGetGame(gameType);
    return linesToRender.map((line, lineIdx) => {
      const { rng, allRngs, actualTotalWin, mathIdRng } = ((): {
        rng: number[] | null;
        allRngs?: number[][];
        actualTotalWin: number;
        mathIdRng: string[] | null;
      } => {
              if (getTraits(gameType).mathIdGenerator) {
                const grid: string[][] = Array.from({ length: reelCount }, (_, c) => Array(rowCounts[c] || 3).fill('-'));
                for (let c = 0; c < line.length; c++) {
                  if (useWxInLines && (c === 1 || c === 3)) {
                    grid[c][line[c]] = 'WX';
                  } else {
                    grid[c][line[c]] = activeLineViewerSymbol;
                  }
                }

                const excludeSymbols = [activeLineViewerSymbol, 'WX', 'WY', 'WZ', 'NI', 'F1', 'F2', 'F3', 'F4', 'L1', 'L2'];
                const nonScatters = currentPaytable.filter(p => p.isEnabled !== false && !p.isScatter && !excludeSymbols.includes(p.symbolId)).map(p => p.symbolId);

                let nsIdx = 0;
                for (let c = 0; c < reelCount; c++) {
                  for (let r = 0; r < grid[c].length; r++) {
                    if (grid[c][r] === '-') {
                      grid[c][r] = nonScatters.length > 0 ? nonScatters[nsIdx % nonScatters.length] : 'NI';
                      nsIdx++;
                    }
                  }
                }

                const mathIdMap: Record<string, string> = {};
                currentPaytable.forEach(p => {
                  if (p.mathId !== undefined) {
                    const ids = String(p.mathId).split(',').map(s => s.trim());
                    mathIdMap[p.symbolId] = ids[0];
                  }
                });

                const columnStrings: string[] = [];
                for (let c = 0; c < reelCount; c++) {
                  const colArr = [];
                  for (let r = 0; r < grid[c].length; r++) {
                    const s = grid[c][r];
                    colArr.push(mathIdMap[s] || s);
                  }
                  columnStrings.push(colArr.join(','));
                }

                

                return { rng: null, actualTotalWin: lineViewerPayout, mathIdRng: columnStrings };
              }

              const candidatesPerReel: number[][] = [];
              for (let col = 0; col < reelCount; col++) {
                const strip = currentStrips[col];
                const candidates: number[] = [];
                if (strip && strip.length > 0) {
                  for (let i = 0; i < strip.length; i++) {
                    const sym = strip[(i + line[col]) % strip.length];
                    if (sym === activeLineViewerSymbol || (useWxInLines && (sym === 'WX' || sym === 'WILD' || sym === 'W'))) {
                      candidates.push(i);
                    }
                  }
                }
                if (candidates.length === 0) return { rng: null, actualTotalWin: 0, mathIdRng: null };
                candidatesPerReel.push(candidates);
              }

              let bestRng: number[] | null = null;
              let bestSafeRng1: number[] | null = null;
              let bestTotalWin = 0;
              let minInterference = Infinity;
              let foundPerfect = false;
              let searchCount = 0;
              const MAX_SEARCH = 2500;

              const search = (colIdx: number, currentRng: number[]) => {
                if (foundPerfect || searchCount >= MAX_SEARCH) return;

                if (colIdx === reelCount) {
                  searchCount++;
                  const testGrid = currentRng.map((start, cIdx) => {
                    const r = rowCounts[cIdx] || 3;
                    const s = currentStrips[cIdx];
                    return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
                  });

                  // 評估真實贏分 (includeZeroPayout: false)
                  const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
                  const payingWins = evWins.filter(w => w.payout > 0);
                  const targetWin = payingWins.find(w => w.lineIndex === lineIdx);

                  // 規則 1 檢查：必須有目標線路贏分
                  if (!targetWin) return;
                  const interferenceWins = payingWins.filter(w => w.lineIndex !== lineIdx);
                  const interference = interferenceWins.length;

                  let currentSafeRng1: number[] | null = null;
                  if (refillGame?.findRefillRng) {
                    {
                      // 只有在 0 干擾時進行掉落殘留自連線與遞補驗證
                      if (interference === 0) {
                        currentSafeRng1 = refillGame.findRefillRng(testGrid, payingWins, currentPaytable, {
                          stripSets, fallbackStrips: currentStrips, rowCounts, paylines: linesToRender, maxAttempts: 300,
                        });
                        if (currentSafeRng1) {
                          // 完美達成：規則 1 (0干擾) + 規則 2A (殘留0連線) + 規則 2B (遞補0消除)！
                          foundPerfect = true;
                          bestRng = [...currentRng];
                          bestTotalWin = targetWin.totalWin;
                          bestSafeRng1 = currentSafeRng1;
                          return;
                        }
                      }
                    }
                  } else {
                    if (interference === 0) {
                      foundPerfect = true;
                      bestRng = [...currentRng];
                      bestTotalWin = targetWin.totalWin;
                      return;
                    }
                  }

                  if (!foundPerfect && interference < minInterference) {
                    minInterference = interference;
                    bestRng = [...currentRng];
                    bestTotalWin = targetWin.totalWin;
                    bestSafeRng1 = currentSafeRng1;
                  }
                  return;
                }

                const cands = candidatesPerReel[colIdx];
                for (let i = 0; i < cands.length; i++) {
                  currentRng.push(cands[i]);
                  search(colIdx + 1, currentRng);
                  currentRng.pop();
                  if (foundPerfect || searchCount >= MAX_SEARCH) break;
                }
              };

              search(0, []);

              let finalRng: number[] | null = bestRng ? (bestRng as number[]).slice(0, 5) : null;
              let finalTotalWin = bestTotalWin;

              if (!finalRng) {
                const fallbackRng = candidatesPerReel.map(c => c[0]);
                const testGrid = fallbackRng.map((start, cIdx) => {
                  const r = rowCounts[cIdx] || 3;
                  const s = currentStrips[cIdx];
                  return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
                });
                const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
                finalRng = fallbackRng.slice(0, 5);
                finalTotalWin = evWins.reduce((sum, w) => sum + w.totalWin, 0);
              }

              let allRngs: number[][] | undefined = undefined;
              if (refillGame?.findRefillRng && finalRng && finalTotalWin > 0) {
                if (bestSafeRng1) {
                  allRngs = [finalRng, (bestSafeRng1 as number[]).slice(0, 5)];
                } else {
                  try {
                    const testGrid = finalRng.map((start, cIdx) => {
                      const r = rowCounts[cIdx] || 3;
                      const s = currentStrips[cIdx];
                      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
                    });
                    const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
                    {
                      const safeRng1 = refillGame.findRefillRng(testGrid, evWins, currentPaytable, {
                        stripSets, fallbackStrips: currentStrips, rowCounts, paylines: linesToRender, maxAttempts: 1500,
                      });
                      if (safeRng1) {
                        allRngs = [finalRng, (safeRng1 as number[]).slice(0, 5)];
                      }
                    }
                  } catch {
                    // ignore
                  }
                }
              }

              return { rng: finalRng, allRngs, actualTotalWin: finalTotalWin, mathIdRng: null };
            })();

      return { line, lineIdx, rng, allRngs, actualTotalWin, mathIdRng };
    });
  }, [linesToRender, gameType, reelCount, rowCounts, activeLineViewerSymbol, currentPaytable, currentStrips, stripSets, useWxInLines, lineViewerPayout, customPaylines]);
  
  return (
    <>
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dashboard-card p-4 rounded-xl border border-dashboard-border">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm text-dashboard-text-secondary font-bold">自訂線路展示樣式</span>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs">選擇展示符號：</span>
                <select
                  value={activeLineViewerSymbol}
                  onChange={(e) => setLineViewerSymbolState(e.target.value)}
                  className="bg-dashboard-card border border-gray-700 text-yellow-400 rounded px-2.5 py-1 outline-none focus:border-yellow-500 text-xs font-mono font-bold cursor-pointer"
                >
                  {symbols
                    .map(sym => {
                      const rule = currentPaytable.find(p => p.symbolId === sym);
                      const parseId = (val: string | number | undefined) => {
                        if (val === undefined || val === '') return 999;
                        if (typeof val === 'number') return val;
                        const match = String(val).match(/\\d+/);
                        return match ? parseInt(match[0], 10) : 999;
                      };
                      return { sym, mathId: rule ? parseId(rule.mathId) : 999 };
                    })
                    .sort((a, b) => a.mathId - b.mathId)
                    .map(({ sym }) => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer hover:text-dashboard-accent transition-colors font-bold select-none text-dashboard-text-secondary text-xs">
                <input
                  type="checkbox"
                  checked={useWxInLines}
                  onChange={(e) => setUseWxInLines(e.target.checked)}
                  className="accent-dashboard-accent w-3.5 h-3.5 cursor-pointer"
                />
                是否可用 WX
              </label>
              <span className="ml-2 font-mono text-xs text-gray-400">
                (五連線贏分: <span className="text-dashboard-accent font-bold">{formatAmount(lineViewerPayout * betMultiplier)}</span>)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-dashboard-text-secondary font-mono">共計 {customPaylines && customPaylines.length > 0 ? customPaylines.length : defaultPaylines.length} 條線路</span>
            <button
              onClick={() => {
                const textToCopy = computedLines.map(c => {
                  if (c.mathIdRng) return `[${c.mathIdRng.join(',')}]`;
                  if (c.allRngs && c.allRngs.length > 1) {
                    return c.allRngs.map(r => `[${r.slice(0, 5).join(',')}]`).join(',\n');
                  }
                  if (c.rng) return `[${c.rng.slice(0, 5).join(',')}]`;
                  return '';
                }).filter(Boolean).map(c => c.endsWith(',') ? c : c + ',').join('\n');
                navigator.clipboard.writeText(textToCopy);
                setIsCopiedAll(true);
                setTimeout(() => setIsCopiedAll(false), 2000);
              }}
              className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${
                isCopiedAll 
                  ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                  : 'bg-dashboard-accent/10 hover:bg-dashboard-accent/20 text-dashboard-accent border-dashboard-accent/30'
              }`}
            >
              {isCopiedAll ? '✅ 已複製全部！' : '📋 複製全部腳本'}
            </button>
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {computedLines.map(({ line, lineIdx, rng, allRngs, actualTotalWin, mathIdRng }) => {
return (
              <div key={lineIdx} className="bg-dashboard-bg border border-gray-700/50 rounded-lg p-3 flex flex-col items-center gap-3 hover:border-dashboard-accent/50 transition-colors">
                <div className="flex justify-between w-full text-xs font-mono border-b border-gray-800 pb-1.5">
                  <span className="text-dashboard-accent font-bold">Line {lineIdx + 1}</span>
                  <span className="text-gray-400">{activeLineViewerSymbol}*{line.length}</span>
                </div>

                <div className="flex gap-1.5 bg-dashboard-card/30 p-2 rounded-md border border-gray-800/50">
                  {line.map((activeRow, colIdx) => {
                    const colRows = rowCounts[colIdx] || 3;
                    return (
                    <div key={colIdx} className="flex flex-col gap-1.5">
                      {Array.from({ length: colRows }).map((_, rowIdx) => {
                        const isActive = rowIdx === activeRow;
                        let displaySym = '';
                        let isWild = false;

                        if (isActive) {
                          displaySym = activeLineViewerSymbol;
                          if (rng) {
                            const strip = currentStrips[colIdx];
                            if (strip && strip.length > 0) {
                              const actualSym = strip[(rng[colIdx] + rowIdx) % strip.length];
                              if (useWxInLines && (actualSym === 'WX' || actualSym === 'WILD' || actualSym === 'W')) {
                                displaySym = actualSym;
                                isWild = true;
                              }
                            }
                          }
                        }

                        return (
                          <div
                            key={rowIdx}
                            className={`w-7 h-7 shrink-0 rounded flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                              isActive
                                ? isWild
                                ? symbolToneClass('WX')
                                : 'bg-dashboard-accent text-dashboard-on-accent border border-dashboard-accent-strong'
                              : 'bg-dashboard-inset text-dashboard-text-muted border border-dashboard-border'
                            }`}
                          >
                            {isActive ? displaySym : ''}
                          </div>
                        );
                      })}
                    </div>
                  )})}
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="text-xs font-mono text-dashboard-text-secondary">
                    贏分: <span className="text-yellow-400 font-bold">{(rng || mathIdRng) ? formatAmount(actualTotalWin * betMultiplier) : 0}</span>
                  </div>
                  {(rng || mathIdRng) ? (
                    <button
                      onClick={() => {
                        let text = '';
                        if (mathIdRng) {
                          setManualIndices(mathIdRng);
                          setManualIndicesOther(mathIdRng);
                          text = `[${mathIdRng.join(',')}],`;
                        } else if (allRngs && allRngs.length > 1) {
                          const strRng = rng!.slice(0, 5).map(String);
                          setManualIndices(strRng);
                          setManualIndicesOther(strRng);
                          text = allRngs.map(r => `[${r.slice(0, 5).join(',')}]`).join(',\n') + ',';
                        } else if (rng) {
                          const strRng = rng.slice(0, 5).map(String);
                          setManualIndices(strRng);
                          setManualIndicesOther(strRng);
                          text = `[${rng.slice(0, 5).join(',')}],`;
                        }
                        
                        navigator.clipboard.writeText(text);

                        setCopiedIndex(lineIdx);
                        setTimeout(() => setCopiedIndex(null), 1000);
                      }}
                      className={`text-xs font-mono border px-2 py-1.5 rounded cursor-pointer transition-all w-full flex flex-col items-center justify-center gap-0.5 ${
                        copiedIndex === lineIdx
                          ? 'bg-dashboard-card border-dashboard-accent/50'
                          : 'bg-dashboard-card border-gray-700/50 hover:border-dashboard-accent hover:bg-dashboard-card/80 text-dashboard-text-primary'
                      }`}
                      title="點擊自動套用此 RNG 數組至盤面並複製至剪貼簿"
                    >
                      {copiedIndex === lineIdx ? (
                        <div className="w-full text-center text-dashboard-accent font-bold py-1">COPIED!</div>
                      ) : allRngs && allRngs.length > 1 ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 w-full text-[10.5px]">
                          <span className="text-yellow-400 font-mono truncate max-w-full">
                            初始: [{rng?.slice(0, 5).join(',')}],
                          </span>
                          <span className="text-dashboard-accent font-mono truncate max-w-full">
                            遞補: [{allRngs[1]?.slice(0, 5).join(',')}], <span className="text-[9px] text-green-400 font-bold">(0消除)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                          <span className="text-dashboard-accent leading-tight truncate max-w-full text-center" title={mathIdRng ? `[${mathIdRng.join(',')}]` : `[${rng?.join(',')}]`}>
                            {mathIdRng ? `[${mathIdRng.join(',').slice(0, 20)}...],` : `[${rng?.join(',')}],`}
                          </span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-red-500 font-bold">無可行 RNG</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};