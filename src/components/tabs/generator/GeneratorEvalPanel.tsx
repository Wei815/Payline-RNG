import React, { useState } from 'react';
import type { GameType } from '../../../types';
import type { WinResult } from '../../../utils/evaluation';
import { formatAmount } from '../../../utils/formatters';
import { getTraits } from '../../../games/registry';
import { boardBallMultiplier } from '../../../flows/ballMultiplier';

interface GeneratorEvalPanelProps {
  wins: WinResult[];
  selectedSymbol: string;
  gameType: GameType;
  bet: number;
  betMultiplier: number;
  /** 第一盤的連續掉落倍數 */
  baseMultiplier: number;
  /** 目前盤面（計算倍數球） */
  displayGrid: string[][];
  /** 干擾中獎的閃爍樣式（與盤面同步） */
  pulseClass: string;
}

/** 連線測試產生器：連線結果（左欄有贏分、右欄無贏分） */
export const GeneratorEvalPanel: React.FC<GeneratorEvalPanelProps> = ({
  wins: winsOther, selectedSymbol, gameType, bet, betMultiplier, baseMultiplier, displayGrid: displayGridOther, pulseClass,
}) => {
  const [noWinCollapsed, setNoWinCollapsed] = useState(false);
  return (
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
                const finalMultiplier = boardBallMultiplier(gameType, displayGridOther);
                const globalMultiplier = finalMultiplier > 1 ? finalMultiplier : 0;
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
  );
};
