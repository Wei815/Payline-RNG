import { useState, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { SlotConsole } from './components/SlotConsole';
import { MetricsDashboard } from './components/MetricsDashboard';
import { useSimulation } from './hooks/useSimulation';
import { BarChart3, X } from 'lucide-react';
import type { GameType } from './types';

function App() {
  const { isRunning, progress, currentSpins, currentGrid, result, runSimulation } = useSimulation();
  const [reelCount, setReelCount] = useState<number>(5);
  const [rowCounts, setRowCounts] = useState<number[]>(Array(5).fill(3));
  const [isMetricsOpen, setIsMetricsOpen] = useState<boolean>(false);
  const [currentStrips, setCurrentStrips] = useState<any[]>([]);
  const [currentPaytable, setCurrentPaytable] = useState<any[]>([]);
  const [coin, setCoin] = useState<number>(1);
  const [gameType, setGameType] = useState<GameType>('waygame');
  const [customPaylines, setCustomPaylines] = useState<number[][]>([]);

  const handleReelCountChange = (newCount: number) => {
    setReelCount(newCount);
    setRowCounts(prev => {
      if (newCount > prev.length) return [...prev, ...Array(newCount - prev.length).fill(3)];
      if (newCount < prev.length) return prev.slice(0, newCount);
      return prev;
    });
  };

  const handleTestSpin = useCallback((strips: any[], paytable: any[], spins?: number, rows?: number[], paylines?: number[][]) => {
    runSimulation(strips, paytable, spins, rows, gameType, paylines || customPaylines);
  }, [runSimulation, gameType, customPaylines]);

  const handleConfigSync = useCallback((strips: any[], paytable: any[]) => {
    setCurrentStrips(strips);
    setCurrentPaytable(paytable);
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row bg-dashboard-bg overflow-hidden text-dashboard-text-primary">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full h-14 bg-[#0f1d35] border-b border-gray-800 flex items-center justify-between px-6 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-widest text-dashboard-text-primary flex items-center gap-2">
            <span className="text-dashboard-accent">RNG</span> PAY
          </h1>
          <span className="ml-4 text-xs font-mono text-dashboard-text-secondary border border-gray-700 px-2 py-0.5 rounded-full bg-[#112240] hidden sm:block">
            v1.0 Simulation Engine
          </span>
        </div>
        <button 
          onClick={() => setIsMetricsOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#112240] border border-dashboard-accent text-dashboard-accent rounded-lg hover:bg-dashboard-accent hover:text-[#0a192f] transition-all font-bold text-sm"
        >
          <BarChart3 size={16} />
          <span>RTP 測試報告</span>
        </button>
      </div>

      {/* Main Grid Layout - pt-14 to offset header */}
      <div className="flex-1 w-full flex flex-col md:flex-row pt-14">
        {/* Left: ConfigPanel (35%) */}
        <div className="w-full md:w-[35%] h-full">
          <ConfigPanel 
            isRunning={isRunning} 
            coin={coin}
            onCoinChange={setCoin}
            gameType={gameType}
            onGameTypeChange={setGameType}
            onTestSpin={handleTestSpin}
            onConfigSync={handleConfigSync}
            reelCount={reelCount}
            onReelCountChange={handleReelCountChange}
            rowCounts={rowCounts}
            customPaylines={customPaylines}
            onPaylinesChange={setCustomPaylines}
          />
        </div>

        {/* Center: SlotConsole (65%) */}
        <div className="w-full md:w-[65%] h-full">
          <SlotConsole 
            isRunning={isRunning}
            progress={progress}
            currentSpins={currentSpins}
            currentGrid={currentGrid}
            totalSpins={result ? result.totalSpins : (isRunning ? Math.max(currentSpins, 1000) : 1000)}
            reelCount={reelCount}
            rowCounts={rowCounts}
            onRowCountsChange={setRowCounts}
            currentStrips={currentStrips}
            currentPaytable={currentPaytable}
            coin={coin}
            gameType={gameType}
            customPaylines={customPaylines}
          />
        </div>
      </div>

      {/* Metrics Modal */}
      {isMetricsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="bg-[#0a192f] border border-gray-600 w-full max-w-5xl h-full max-h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#0f1d35] shrink-0">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-dashboard-accent" />
                <h2 className="text-xl font-bold text-dashboard-text-primary tracking-wide">RTP 測試報告</h2>
              </div>
              <button 
                onClick={() => setIsMetricsOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-[#0a192f]">
              <MetricsDashboard 
                result={result}
                isRunning={isRunning}
                progress={progress}
                currentSpins={currentSpins}
                totalSpins={result ? result.totalSpins : (isRunning ? Math.max(currentSpins, 100000) : 100000)}
                hasData={currentStrips.length > 0 && currentStrips.every(strip => strip.length > 0)}
                onRunSimulation={() => {
                  runSimulation(currentStrips, currentPaytable, 100000, rowCounts, gameType, customPaylines);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
