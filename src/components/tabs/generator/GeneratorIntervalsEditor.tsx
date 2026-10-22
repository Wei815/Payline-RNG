import React, { useMemo, useState } from 'react';
import type { GameType, MultiplierInterval } from '../../../types';
import { getGameIntervals } from '../../../utils/evaluation/GameIntervals';

interface GeneratorIntervalsEditorProps {
  gameType: GameType;
  /** 選擇「大獎區間」時才顯示（保持掛載，切換符號時保留編輯中的區間） */
  visible: boolean;
  /** 搜尋進行中（停用按鈕並顯示進度） */
  isSearching: boolean;
  /** 按下「產生對應大獎 RNG」：以目前的區間重新搜尋 */
  onApply: (intervals: MultiplierInterval[]) => void;
}

/** 連線測試產生器：大獎區間設定（編輯中的區間與驗證） */
export const GeneratorIntervalsEditor: React.FC<GeneratorIntervalsEditorProps> = ({ gameType, visible, isSearching, onApply }) => {
  const [multiplierIntervals, setMultiplierIntervals] = useState<MultiplierInterval[]>(() => getGameIntervals(gameType));

  // 切換遊戲時回到該遊戲的預設區間
  const [intervalsGameType, setIntervalsGameType] = useState(gameType);
  if (intervalsGameType !== gameType) {
    setIntervalsGameType(gameType);
    setMultiplierIntervals(getGameIntervals(gameType));
  }

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

  if (!visible) return null;
  return (
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
            onApply([]);
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
                    onApply([]);
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
                      onApply([]);
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
                      onApply([]);
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
                    onApply([]);
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
          onApply([...multiplierIntervals]);
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
  );
};
