import React from 'react';
import { formatAmount } from '../../utils/formatters';
import type { GameType, PaytableRule } from '../../types';
import { symbolToneClass } from '../ui/symbolTone';
import { computeLineViewerLines } from '../../flows/lineViewer';
import { copyText } from '../../utils/clipboard';

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

  // 每條線的 RNG 搜尋邏輯在 flows/lineViewer.ts（有規則測試）
  const computedLines = React.useMemo(() => computeLineViewerLines({
    gameType, reelCount, rowCounts, currentStrips, stripSets, currentPaytable, customPaylines,
    linesToRender, activeLineViewerSymbol, useWxInLines, lineViewerPayout,
  }), [linesToRender, gameType, reelCount, rowCounts, activeLineViewerSymbol, currentPaytable, currentStrips, stripSets, useWxInLines, lineViewerPayout, customPaylines]);
  
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
                    return c.allRngs.map(r => `[${r.slice(0, reelCount).join(',')}]`).join(',\n');
                  }
                  if (c.rng) return `[${c.rng.slice(0, reelCount).join(',')}]`;
                  return '';
                }).filter(Boolean).map(c => c.endsWith(',') ? c : c + ',').join('\n');
                copyText(textToCopy);
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
                          const strRng = rng!.slice(0, reelCount).map(String);
                          setManualIndices(strRng);
                          setManualIndicesOther(strRng);
                          text = allRngs.map(r => `[${r.slice(0, reelCount).join(',')}]`).join(',\n') + ',';
                        } else if (rng) {
                          const strRng = rng.slice(0, reelCount).map(String);
                          setManualIndices(strRng);
                          setManualIndicesOther(strRng);
                          text = `[${rng.slice(0, reelCount).join(',')}],`;
                        }
                        
                        copyText(text);

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
                            初始: [{rng?.slice(0, reelCount).join(',')}],
                          </span>
                          <span className="text-dashboard-accent font-mono truncate max-w-full">
                            遞補: [{allRngs[1]?.slice(0, reelCount).join(',')}], <span className="text-[9px] text-green-400 font-bold">(0消除)</span>
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