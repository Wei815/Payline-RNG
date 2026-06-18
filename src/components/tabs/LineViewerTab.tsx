import React from 'react';
import { evaluateGrid } from '../../utils/evaluation';
import { formatAmount } from '../../utils/slotUtils';
import type { GameType, PaytableRule } from '../../types';

export interface LineViewerTabProps {
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
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
  reelCount, rowCounts, currentStrips, activeLineViewerSymbol, setLineViewerSymbolState,
  symbols, useWxInLines, setUseWxInLines, lineViewerPayout, betMultiplier,
  customPaylines, defaultPaylines, setManualIndices, setManualIndicesOther,
  copiedIndex, setCopiedIndex, currentPaytable, gameType
}) => {
  return (
    <>
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-between items-center bg-[#0a192f] p-4 rounded-lg border border-gray-700/50">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm text-dashboard-text-secondary font-bold">自訂線路展示樣式</span>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs">選擇展示符號：</span>
                <select
                  value={activeLineViewerSymbol}
                  onChange={(e) => setLineViewerSymbolState(e.target.value)}
                  className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2.5 py-1 outline-none focus:border-yellow-500 text-xs font-mono font-bold cursor-pointer"
                >
                  {symbols.map(sym => (
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
          <span className="text-xs text-dashboard-text-secondary font-mono">共計 {customPaylines && customPaylines.length > 0 ? customPaylines.length : defaultPaylines.length} 條線路</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(customPaylines && customPaylines.length > 0 ? customPaylines : defaultPaylines).map((line, lineIdx) => {
            const maxRowVal = Math.max(...line);
            const displayRows = Math.max(3, maxRowVal + 1);

            // 計算該線路對應的 RNG 起點 (尋找最乾淨盤面)
            const { rng, actualTotalWin } = (() => {
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
                if (candidates.length === 0) return { rng: null, actualTotalWin: 0 };
                candidatesPerReel.push(candidates);
              }

              let bestRng: number[] | null = null;
              let bestTotalWin = 0;
              let minInterference = Infinity;
              let searchCount = 0;
              const MAX_SEARCH = 200;

              const search = (colIdx: number, currentRng: number[]) => {
                if (minInterference === 0 || searchCount >= MAX_SEARCH) return;

                if (colIdx === reelCount) {
                  searchCount++;
                  const testGrid = currentRng.map((start, cIdx) => {
                    const r = rowCounts[cIdx] || 3;
                    const s = currentStrips[cIdx];
                    return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
                  });

                  const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, true);

                  let interference = 0;
                  let totalWin = 0;
                  for (const w of evWins) {
                    totalWin += w.totalWin;
                    if (w.payout > 0 && w.lineIndex !== lineIdx) {
                      interference++;
                    }
                  }

                  if (interference < minInterference) {
                    minInterference = interference;
                    bestRng = [...currentRng];
                    bestTotalWin = totalWin;
                  }
                  return;
                }

                // 最多嘗試 5 個候選位置
                const limit = Math.min(candidatesPerReel[colIdx].length, 5);
                for (let i = 0; i < limit; i++) {
                  currentRng.push(candidatesPerReel[colIdx][i]);
                  search(colIdx + 1, currentRng);
                  currentRng.pop();
                  if (minInterference === 0 || searchCount >= MAX_SEARCH) break;
                }
              };

              search(0, []);

              if (!bestRng) {
                const fallbackRng = candidatesPerReel.map(c => c[0]);
                const testGrid = fallbackRng.map((start, cIdx) => {
                  const r = rowCounts[cIdx] || 3;
                  const s = currentStrips[cIdx];
                  return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
                });
                const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, true);
                return {
                  rng: fallbackRng,
                  actualTotalWin: evWins.reduce((sum, w) => sum + w.totalWin, 0)
                };
              }

              return { rng: bestRng, actualTotalWin: bestTotalWin };
            })();

            return (
              <div key={lineIdx} className="bg-[#0a192f] border border-gray-700/50 rounded-lg p-3 flex flex-col items-center gap-3 hover:border-dashboard-accent/50 transition-colors">
                <div className="flex justify-between w-full text-xs font-mono border-b border-gray-800 pb-1.5">
                  <span className="text-dashboard-accent font-bold">Line {lineIdx + 1}</span>
                  <span className="text-gray-400">{activeLineViewerSymbol}*{line.length}</span>
                </div>

                <div className="flex gap-1.5 bg-[#112240]/30 p-2 rounded-md border border-gray-800/50">
                  {line.map((activeRow, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-1.5">
                      {Array.from({ length: displayRows }).map((_, rowIdx) => {
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
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.6)]'
                                  : 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                                : 'bg-[#112240]/40 text-gray-700 border border-gray-800/20'
                            }`}
                          >
                            {isActive ? displaySym : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="text-xs font-mono text-dashboard-text-secondary">
                    贏分: <span className="text-yellow-400 font-bold">{rng ? formatAmount(actualTotalWin * betMultiplier) : 0}</span>
                  </div>
                  {rng ? (
                    <button
                      onClick={() => {
                        const strRng = rng.map(String);
                        setManualIndices(strRng);
                        setManualIndicesOther(strRng);

                        // 複製到剪貼簿
                        const text = `[${rng.join(',')}],`;
                        navigator.clipboard.writeText(text);

                        setCopiedIndex(lineIdx);
                        setTimeout(() => setCopiedIndex(null), 1000);
                      }}
                      className={`text-xs font-mono border px-2 py-1 rounded cursor-pointer transition-all w-full text-center ${
                        copiedIndex === lineIdx
                          ? 'bg-[#64ffda] text-[#0a192f] border-[#64ffda] font-bold'
                          : 'bg-[#0a192f] border-dashboard-accent/30 hover:border-dashboard-accent text-dashboard-accent hover:bg-dashboard-accent hover:text-[#0a192f]'
                      }`}
                      title="點擊自動套用此 RNG 數組至盤面並複製至剪貼簿"
                    >
                      {copiedIndex === lineIdx ? 'COPIED!' : `RNG: [${rng.join(',')}],`}
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