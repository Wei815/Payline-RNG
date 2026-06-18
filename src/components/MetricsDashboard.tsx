import React from 'react';
import type { SimulationResult } from '../types';

interface MetricsDashboardProps {
  result: SimulationResult | null;
  isRunning: boolean;
  progress: number;
  currentSpins: number;
  totalSpins: number;
  hasData: boolean;
  onRunSimulation: () => void;
  reelCount: number;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ result, isRunning, progress, currentSpins, totalSpins, hasData, onRunSimulation, reelCount }) => {
  const matchesToShow = Array.from({ length: reelCount - 1 }, (_, i) => reelCount - i);

  return (
    <div className="h-full flex flex-col bg-[#0a192f] p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-dashboard-text-primary">Metrics Dashboard</h2>
        <button 
          onClick={onRunSimulation}
          disabled={isRunning || !hasData}
          className="flex items-center gap-2 px-6 py-2 bg-dashboard-accent text-[#0a192f] font-bold rounded-lg hover:bg-teal-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0a192f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running... {progress.toFixed(0)}%
            </>
          ) : (
            'Run RTP Simulation'
          )}
        </button>
      </div>

      {/* Simulation Progress (Visible when running or completed) */}
      {(isRunning || result) && (
        <div className="w-full flex flex-col gap-2 mb-6 bg-dashboard-card p-4 rounded-lg border border-gray-700/30">
          <div className="flex justify-between items-end">
            <span className="text-dashboard-text-secondary text-sm font-medium">Simulation Progress</span>
            <span className="text-dashboard-accent font-mono text-lg">{currentSpins.toLocaleString()} / {totalSpins.toLocaleString()}</span>
          </div>
          <div className="w-full bg-[#112240] h-2.5 rounded-full overflow-hidden border border-gray-700/50">
            <div 
              className="bg-dashboard-accent h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1a2b4c] rounded-xl p-5 border border-blue-900/30 flex flex-col justify-center items-center">
          <span className="text-dashboard-text-secondary text-sm mb-1">Total RTP %</span>
          <span className="text-4xl font-bold text-dashboard-accent drop-shadow-[0_0_8px_rgba(100,255,218,0.3)]">
            {result ? result.overallRTP.toFixed(2) + '%' : '--.--%'}
          </span>
        </div>
        <div className="bg-[#1a2b4c] rounded-xl p-5 border border-blue-900/30 flex flex-col justify-center items-center">
          <span className="text-dashboard-text-secondary text-sm mb-1">Hit Frequency</span>
          <span className="text-4xl font-bold text-dashboard-text-primary drop-shadow-[0_0_8px_rgba(230,241,255,0.2)]">
            {result ? result.hitFrequency.toFixed(2) + '%' : '--.--%'}
          </span>
        </div>
        <div className="bg-[#112240] rounded-xl p-4 border border-gray-700/40 flex flex-col justify-center items-center">
          <span className="text-dashboard-text-secondary text-xs mb-1">有效 BET（每 spin 投注）</span>
          <span className="text-2xl font-bold text-yellow-400 font-mono">
            {result ? result.effectiveBet : '--'}
          </span>
        </div>
        <div className="bg-[#112240] rounded-xl p-4 border border-gray-700/40 flex flex-col justify-center items-center">
          <span className="text-dashboard-text-secondary text-xs mb-1">使用條線數 / 遊戲類型</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">
            {result
              ? result.gameType === 'linegame'
                ? `${result.paylineCount} 條`
                : result.gameType
              : '--'}
          </span>
        </div>
      </div>

      {/* Symbol Metrics Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <h3 className="text-sm font-semibold text-dashboard-text-secondary mb-3 uppercase tracking-wider">Symbol Metrics</h3>
        <div className="flex-1 overflow-auto custom-scrollbar rounded-lg border border-gray-700/50">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f1d35] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-dashboard-text-secondary font-medium">Symbol</th>
                {matchesToShow.map(match => (
                  <th key={match} className="px-4 py-3 text-dashboard-text-secondary font-medium text-right">Hit {match}</th>
                ))}
                <th className="px-4 py-3 text-dashboard-text-secondary font-medium text-right">RTP Contrib.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-[#162542]">
              {result ? (
                Object.values(result.symbolMetrics).map(metric => (
                  <tr key={metric.symbolId} className="hover:bg-[#1a2b4c] transition-colors">
                    <td className="px-4 py-3 font-semibold text-dashboard-text-primary flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${metric.symbolId === 'WILD' || metric.symbolId === 'WX' ? 'bg-yellow-400' : metric.symbolId === 'SCATTER' || metric.symbolId === 'S1' ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                      {metric.symbolId}
                    </td>
                    {matchesToShow.map(match => {
                      const hits = (metric[`hits${match}` as keyof typeof metric] as number) || 0;
                      return (
                        <td key={match} className="px-4 py-3 text-right text-dashboard-text-secondary">
                          {hits.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-mono text-dashboard-accent">
                      {metric.contributionRTP.toFixed(2)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={matchesToShow.length + 2} className="px-4 py-12 text-center text-dashboard-text-secondary/80 font-bold">
                    Run simulation to see symbol metrics
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
