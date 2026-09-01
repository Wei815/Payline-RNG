import React, { useState, useMemo } from 'react';
import { X, Play, Square, Calculator, AlertCircle, Percent, Target, Coins, BarChart2, ArrowDownWideNarrow } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';
import { useSimulation } from '../../hooks/useSimulation';
import { formatAmount } from '../../utils/formatters';
import { getBaseSymbol } from '../../utils/evaluation/GameConstants';
import type { GameConfig } from '../../types';

interface RtpCalculatorProps {
  onClose: () => void;
}

export const RtpCalculator: React.FC<RtpCalculatorProps> = ({ onClose }) => {
  const {
    isProjectLoaded,
    currentStripSets,
    currentFreeStripSets,
    currentPaytable,
    rowCounts,
    reelCount
  } = useGameStore();

  const { gameType, bet, coin } = useMachineStore();
  const betMultiplier = coin > 0 ? bet / coin : 1;

  const { isRunning, progress, currentSpins, result, runSimulation } = useSimulation();

  const [selectedSpins, setSelectedSpins] = useState<number>(100000);
  const [selectedStripKey, setSelectedStripKey] = useState<string>('base-0');

  const spinOptions = [1000, 10000, 100000, 1000000];

  const handleStart = () => {
    if (!isProjectLoaded) return;

    let isFreeGame = false;
    let stripId = 0;
    let mode: 'base_only' | 'free_only' | 'full_game' = 'base_only';

    if (selectedStripKey.startsWith('full-')) {
      mode = 'full_game';
      stripId = parseInt(selectedStripKey.replace('full-', ''), 10);
    } else if (selectedStripKey.startsWith('free-')) {
      mode = 'free_only';
      isFreeGame = true;
      stripId = parseInt(selectedStripKey.replace('free-', ''), 10);
    } else {
      mode = 'base_only';
      isFreeGame = false;
      stripId = parseInt(selectedStripKey.replace('base-', ''), 10);
    }

    const strips = currentStripSets[stripId] || [];
    const freeStrips = currentFreeStripSets[stripId] || [];

    if (mode === 'free_only' && (!freeStrips || freeStrips.length === 0)) return;
    if (mode === 'base_only' && (!strips || strips.length === 0)) return;

    const gameConfig: GameConfig = {
      gameType,
      paylines: [],
      specialRules: {
        unremovableSymbols: ['S1', 'B1']
      }
    };

    const targetStrips = mode === 'free_only' ? freeStrips : strips;

    runSimulation(targetStrips, currentPaytable, selectedSpins, rowCounts, gameConfig, coin, bet, isFreeGame, mode, mode === 'full_game' ? freeStrips : undefined);
  };

  const sortedMetrics = useMemo(() => {
    if (!result?.symbolMetrics) return [];
    return Object.values(result.symbolMetrics)
      .filter(m => getBaseSymbol(m.symbolId) === m.symbolId)
      .sort((a, b) => b.contributionRTP - a.contributionRTP);
  }, [result?.symbolMetrics]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a192f] w-[95vw] max-w-[1400px] h-[90vh] rounded-xl shadow-2xl border border-blue-500/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-[#112240]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calculator className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">RTP 模擬計算機</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Settings */}
          <div className="w-[350px] border-r border-gray-700/50 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            {!isProjectLoaded && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">請先載入專案 (Excel 範本) 後再執行模擬計算。</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">選擇測試滾輪表</label>
                <select
                  value={selectedStripKey}
                  onChange={(e) => setSelectedStripKey(e.target.value)}
                  className="w-full bg-[#0a192f] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  disabled={!isProjectLoaded || isRunning}
                >
                  <optgroup label="全流程模擬 (Base + Free)">
                    {currentStripSets.map((_, i) => {
                      const hasFree = currentFreeStripSets[i] && currentFreeStripSets[i].length > 0;
                      if (!hasFree) return null;
                      return (
                        <option key={`full-${i}`} value={`full-${i}`}>
                          Full Game - Strip Set {i}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Base Game 滾輪表 (單測)">
                    {currentStripSets.map((_, i) => (
                      <option key={`base-${i}`} value={`base-${i}`}>
                        Base Game - Strip Set {i}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Free Game 滾輪表 (單測)">
                    {currentFreeStripSets.map((_, i) => (
                      <option key={`free-${i}`} value={`free-${i}`}>
                        Free Game - Strip Set {i}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">選擇測試局數</label>
                <div className="grid grid-cols-2 gap-2">
                  {spinOptions.map((spins) => (
                    <button
                      key={spins}
                      onClick={() => setSelectedSpins(spins)}
                      disabled={!isProjectLoaded || isRunning}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedSpins === spins
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#112240] text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                        } border disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {spins.toLocaleString()} 局
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!isProjectLoaded || isRunning}
              className={`mt-4 w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isRunning
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : !isProjectLoaded
                  ? 'bg-blue-600/50 text-blue-200/50 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25'
                }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-5 h-5 animate-pulse" />
                  計算中... ({progress.toFixed(1)}%)
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  開始計算 RTP
                </>
              )}
            </button>
          </div>

          {/* Right Column: Results */}
          <div className="flex-1 bg-[#0a192f] flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

              {/* Progress Bar */}
              {(isRunning || result) && (
                <div className="mb-8">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">模擬進度</span>
                    <span className="text-blue-400 font-mono font-bold">
                      {currentSpins.toLocaleString()} / {selectedSpins.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Loading Skeleton */}
              {isRunning && !result && (
                <div className="flex flex-col items-center justify-center mt-20 animate-pulse space-y-6">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  <div className="text-blue-400 font-mono font-bold tracking-widest text-lg">
                    SIMULATING... {progress.toFixed(1)}%
                  </div>
                  <div className="text-gray-500 text-sm">
                    正在進行百萬局蒙地卡羅運算，請稍候...
                  </div>

                  {/* Skeleton Cards */}
                  <div className="grid grid-cols-4 gap-4 w-full mt-8 opacity-20">
                    <div className="h-24 bg-[#112240] rounded-xl border border-blue-500/20"></div>
                    <div className="h-24 bg-[#112240] rounded-xl border border-purple-500/20"></div>
                    <div className="h-24 bg-[#112240] rounded-xl border border-yellow-500/20"></div>
                    <div className="h-24 bg-[#112240] rounded-xl border border-green-500/20"></div>
                  </div>
                  <div className="w-full h-64 bg-[#112240] rounded-xl border border-gray-700/50 mt-4 opacity-20"></div>
                </div>
              )}

              {/* KPI Cards */}
              {result && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#112240] p-4 rounded-xl border border-blue-500/20">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Percent className="w-4 h-4" />
                      <span className="text-sm">總 RTP</span>
                    </div>
                    <div className="text-2xl font-bold text-dashboard-accent">
                      {result.overallRTP.toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Target className="w-4 h-4" />
                      <span className="text-sm">命中率 (Hit Freq)</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                      {result.hitFrequency.toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Coins className="w-4 h-4" />
                      <span className="text-sm">有效底注 (Eff. Bet)</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {result.effectiveBet}
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-green-500/20">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <BarChart2 className="w-4 h-4" />
                      <span className="text-sm">遊戲屬性</span>
                    </div>
                    <div className="text-lg font-bold text-green-400 truncate">
                      {result.gameType}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {result.paylineCount > 0 ? `${result.paylineCount} 條線` : '全盤連線 (Way)'}
                    </div>
                  </div>
                </div>
              )}
              {/* Full Game Detailed Metrics */}
              {result && result.freeGameTriggers !== undefined && result.freeGameTriggers > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#112240] p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <span className="text-xs">Base Game 貢獻 RTP</span>
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                      {((result.baseWin || 0) / ((result.totalSpins || 1) * (betMultiplier || 1)) * 100).toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-pink-500/20 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <span className="text-xs">Free Game 貢獻 RTP</span>
                    </div>
                    <div className="text-lg font-bold text-pink-400">
                      {((result.freeWin || 0) / ((result.totalSpins || 1) * (betMultiplier || 1)) * 100).toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-indigo-500/20 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <span className="text-xs">進免遊次數 (Trigger)</span>
                    </div>
                    <div className="text-lg font-bold text-indigo-400 flex items-center justify-between">
                      <span>{result.freeGameTriggers.toLocaleString()} 次</span>
                      {result.freeGameTriggers > 0 && (
                        <span className="text-xs text-gray-500 font-normal ml-1">({Math.round(1 / (result.freeGameTriggers / (result.totalSpins || 1)))} 轉 1 次)</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#112240] p-4 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <span className="text-xs">Retrigger 次數</span>
                    </div>
                    <div className="text-lg font-bold text-cyan-400 flex items-center justify-between">
                      <span>{(result.freeGameRetriggers || 0).toLocaleString()} 次</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Symbol Metrics Table */}
              {result && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowDownWideNarrow className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-bold text-white">符號 RTP 貢獻度分析</h3>
                  </div>
                  <div className="bg-[#112240] rounded-xl border border-gray-700/50 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 border-b border-gray-700/50">
                        <tr>
                          <th className="px-6 py-4 font-medium">符號 ID</th>
                          <th className="px-6 py-4 font-medium text-right">RTP 貢獻</th>
                          <th className="px-6 py-4 font-medium text-right">Hit 2</th>
                          <th className="px-6 py-4 font-medium text-right">Hit 3</th>
                          <th className="px-6 py-4 font-medium text-right">Hit 4</th>
                          <th className="px-6 py-4 font-medium text-right">Hit 5</th>
                          {reelCount > 5 && (
                            <th className="px-6 py-4 font-medium text-right">Hit 6</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {sortedMetrics.map((metric) => (
                          <tr key={metric.symbolId} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-3">
                              <span className="font-bold text-blue-400">{metric.symbolId}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <span className="font-bold text-dashboard-accent">
                                {metric.contributionRTP.toFixed(3)}%
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right text-gray-300 font-mono">
                              {metric.hits2.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right text-gray-300 font-mono">
                              {metric.hits3.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right text-gray-300 font-mono">
                              {metric.hits4.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right text-gray-300 font-mono">
                              {metric.hits5.toLocaleString()}
                            </td>
                            {reelCount > 5 && (
                              <td className="px-6 py-3 text-right text-gray-300 font-mono">
                                {(metric.hits6 || 0).toLocaleString()}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!isRunning && !result && isProjectLoaded && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                  <Calculator className="w-16 h-16 mb-4 opacity-20" />
                  <p>調整左側設定，點擊「開始計算 RTP」</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
