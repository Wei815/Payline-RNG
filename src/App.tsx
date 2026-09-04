import { useCallback, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { SlotConsole } from './components/SlotConsole';
import { MetricsDashboard } from './components/MetricsDashboard';
import { useSimulation } from './hooks/useSimulation';
import { BarChart3, X } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Sidebar } from './components/Sidebar';
import { JiraLinkGenerator } from './components/tools/JiraLinkGenerator';
import { SnippetLibrary } from './components/tools/SnippetLibrary';
import { JiraReportGenerator } from './components/tools/JiraReportGenerator';
import { JiraReportGeneratorWeb } from './components/tools/JiraReportGeneratorWeb';
import { RngValidator } from './components/tools/RngValidator';
import { RtpCalculator } from './components/tools/RtpCalculator';
import type { GameConfig, GameType } from './types';
import { useMachineStore } from './store/useMachineStore';
import { useGameStore } from './store/useGameStore';

function App() {
  const { isRunning, progress, currentSpins, currentGrid, result, runSimulation } = useSimulation();
  
  const gameType = useMachineStore(state => state.gameType);
  const coin = useMachineStore(state => state.coin);
  const bet = useMachineStore(state => state.bet);

  const customPaylines = useGameStore(state => state.customPaylines);
  const currentStrips = useGameStore(state => state.currentStrips);
  const currentPaytable = useGameStore(state => state.currentPaytable);
  const rowCounts = useGameStore(state => state.rowCounts);
  const isProjectLoaded = useGameStore(state => state.isProjectLoaded);
  
  const setLoadTemplateTrigger = useMachineStore(state => state.setLoadTemplateTrigger);
  const setGameType = useMachineStore(state => state.setGameType);
  const activeModalTool = useMachineStore(state => state.activeModalTool);
  const setActiveModalTool = useMachineStore(state => state.setActiveModalTool);
  
  const [isMetricsOpen, setIsMetricsOpen] = useState<boolean>(false);

  const handleSelectTemplate = useCallback((templateName: string) => {
    const engineMap: Record<string, GameType> = {
      'Line Game': 'linegame',
      'Way Game': 'waygame',
      'Pay Anywhere': 'payanywhere',
      'Megaway': 'megaway'
    };
    if (engineMap[templateName]) {
      setGameType(engineMap[templateName]);
      setLoadTemplateTrigger('預設泛用');
    } else {
      setLoadTemplateTrigger(templateName);
    }
  }, [setGameType, setLoadTemplateTrigger]);

  const handleTestSpin = useCallback((strips: any[], paytable: any[], spins?: number, rows?: number[], paylines?: number[][], isFreeGame?: boolean) => {
    const config: GameConfig = {
      gameType,
      paylines: paylines || customPaylines,
      effectiveBet: bet,
      specialRules: {
        derivativeSymbols: { 'B1': ['B2'] },
        unremovableSymbols: ['S1']
      }
    };
    runSimulation(strips, paytable, spins, rows, config, coin, bet, isFreeGame);
  }, [runSimulation, gameType, customPaylines, coin, bet]);

  const handleDashboardRunSimulation = useCallback(() => {
    const config: GameConfig = {
      gameType,
      paylines: customPaylines,
      effectiveBet: bet,
      specialRules: {
        derivativeSymbols: { 'B1': ['B2'] },
        unremovableSymbols: ['S1']
      }
    };
    // We don't have activeStripTab here, so we assume Base Game if run from Dashboard directly
    runSimulation(currentStrips, currentPaytable, 100000, rowCounts, config, coin, bet, false);
  }, [runSimulation, gameType, customPaylines, bet, currentStrips, currentPaytable, rowCounts, coin]);

  return (
    <div className="w-screen h-screen flex bg-dashboard-bg overflow-hidden text-dashboard-text-primary">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <div className="w-full h-14 bg-[#0f1d35] border-b border-gray-800 flex items-center justify-between px-6 shrink-0 shadow-md z-40">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-widest text-dashboard-text-primary flex items-center gap-2">
            <span className="text-dashboard-accent">RNG</span> PAY
          </h1>
          <span className="ml-4 text-xs font-mono text-dashboard-text-secondary border border-gray-700 px-2 py-0.5 rounded-full bg-[#112240] hidden sm:block">
            v1.0 Simulation Engine
          </span>
        </div>
        {/* 暫時隱藏 RTP 測試報告按鈕 (待後續開發開放)
        <button 
          onClick={() => setIsMetricsOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#112240] border border-dashboard-accent text-dashboard-accent rounded-lg hover:bg-dashboard-accent hover:text-[#0a192f] transition-all font-bold text-sm"
        >
          <BarChart3 size={16} />
          <span>RTP 測試報告</span>
        </button>
        */}
        </div>

        {/* Main Grid Layout */}
        <div className="flex-1 w-full flex flex-col md:flex-row min-h-0">
          {/* Left: ConfigPanel */}
        <div 
          className={`
            ${!isProjectLoaded ? 'hidden' : 'block'}
            w-full h-full transition-all duration-300 ${gameType === 'payanywhere_set2' || gameType === 'linegame_set2' ? 'md:w-[360px] shrink-0' : 'md:w-[35%]'}
          `}
        >
          <ConfigPanel 
            onTestSpin={handleTestSpin}
          />
        </div>

        {/* Center: SlotConsole or WelcomeScreen */}
        <div className="w-full flex-1 h-full min-w-0">
          {!isProjectLoaded ? (
            <WelcomeScreen onSelectTemplate={handleSelectTemplate} />
          ) : (
            <SlotConsole 
              currentGrid={currentGrid}
            />
          )}
        </div>
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
                progress={progress}
                currentSpins={currentSpins}
                totalSpins={result ? result.totalSpins : (isRunning ? Math.max(currentSpins, 100000) : 100000)}
                hasData={currentStrips.length > 0 && currentStrips.every(strip => strip.length > 0)}
                onRunSimulation={handleDashboardRunSimulation}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tools Modals */}
      {activeModalTool === 'jira' && (
        <JiraLinkGenerator onClose={() => setActiveModalTool(null)} />
      )}
      {activeModalTool === 'snippet' && (
        <SnippetLibrary onClose={() => setActiveModalTool(null)} />
      )}
      {activeModalTool === 'jiraReport' && (
        <JiraReportGenerator onClose={() => setActiveModalTool(null)} />
      )}
      {activeModalTool === 'jiraReportWeb' && (
        <JiraReportGeneratorWeb onClose={() => setActiveModalTool(null)} />
      )}
      {activeModalTool === 'rngValidator' && (
        <RngValidator onClose={() => setActiveModalTool(null)} />
      )}
      {activeModalTool === 'rtpCalculator' && (
        <RtpCalculator onClose={() => setActiveModalTool(null)} />
      )}
    </div>
  );
}

export default App;
