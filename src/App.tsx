import { useCallback, useEffect, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { SlotConsole } from './components/SlotConsole';
import { MetricsDashboard } from './components/MetricsDashboard';
import { useSimulation } from './hooks/useSimulation';
import { BarChart3, Menu, X } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Sidebar } from './components/Sidebar';
import { JiraLinkGenerator } from './components/tools/JiraLinkGenerator';
import { SnippetLibrary } from './components/tools/SnippetLibrary';
import { JiraReportGenerator } from './components/tools/JiraReportGenerator';
import { JiraReportGeneratorWeb } from './components/tools/JiraReportGeneratorWeb';
import { JiraBugListGenerator } from './components/tools/JiraBugListGenerator';
import { RngValidator } from './components/tools/RngValidator';
import { RtpCalculator } from './components/tools/RtpCalculator';
import type { GameConfig, GameType } from './types';
import { useMachineStore } from './store/useMachineStore';
import { useGameStore } from './store/useGameStore';
import { getManifest, getTraits, resolveMenuSelection } from './games/registry';

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
  const projectName = useGameStore(state => state.projectName);

  // 側欄：桌面可收合（記住偏好），小螢幕為抽屜
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('rngpay.sidebarCollapsed') === '1'; } catch { return false; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      try { localStorage.setItem('rngpay.sidebarCollapsed', prev ? '0' : '1'); } catch { /* 無痕模式 */ }
      return !prev;
    });
  }, []);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) setMobileNavOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleSelectTemplate = useCallback((templateName: string) => {
    const [targetGameType, trigger] = resolveMenuSelection(templateName);
    if (targetGameType) setGameType(targetGameType);
    setLoadTemplateTrigger(trigger);
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
    <div className="w-screen h-dvh flex bg-dashboard-bg overflow-hidden text-dashboard-text-primary">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="w-full h-14 bg-dashboard-bg/95 backdrop-blur border-b border-dashboard-border flex items-center justify-between gap-3 px-3 sm:px-5 shrink-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover"
            title="開啟選單"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-[0.12em] text-dashboard-text-primary flex items-center gap-1.5 shrink-0">
            <span className="text-dashboard-accent">RNG</span>PAY
          </h1>
          {isProjectLoaded && (
            <div className="hidden sm:flex items-center gap-2 min-w-0 text-[13px]">
              <span className="text-dashboard-border">/</span>
              <span className="text-dashboard-text-secondary truncate">{getManifest(gameType)?.label ?? gameType}</span>
              {projectName && projectName !== '預設泛用' && (
                <span className="truncate max-w-[18rem] px-2 py-0.5 rounded-md bg-dashboard-card border border-dashboard-border text-dashboard-text-secondary font-mono text-[11px]">
                  {projectName}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="hidden md:block text-[11px] font-mono text-dashboard-text-muted shrink-0">Slot Math QA Toolkit</span>
        {/* 暫時隱藏 RTP 測試報告按鈕 (待後續開發開放)
        <button 
          onClick={() => setIsMetricsOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-dashboard-card border border-dashboard-accent text-dashboard-accent rounded-lg hover:bg-dashboard-accent hover:text-dashboard-bg transition-all font-bold text-sm"
        >
          <BarChart3 size={16} />
          <span>RTP 測試報告</span>
        </button>
        */}
        </header>

        {/* Main Grid Layout：寬螢幕左右並排，窄螢幕上下堆疊並整頁捲動 */}
        <main className="flex-1 w-full flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
          {/* Left: ConfigPanel */}
        <div 
          className={`
            ${!isProjectLoaded ? 'hidden' : 'block'}
            w-full shrink-0 h-[80dvh] lg:h-full transition-[width] duration-200 ${getTraits(gameType).mathIdGenerator ? 'lg:w-[340px]' : 'lg:w-[clamp(340px,34%,480px)]'}
          `}
        >
          <ConfigPanel 
            onTestSpin={handleTestSpin}
          />
        </div>

        {/* Center: SlotConsole or WelcomeScreen */}
        <div className={`w-full flex-1 min-w-0 lg:h-full ${isProjectLoaded ? 'min-h-[85dvh] lg:min-h-0' : 'h-full'}`}>
          {!isProjectLoaded ? (
            <WelcomeScreen onSelectTemplate={handleSelectTemplate} />
          ) : (
            <SlotConsole 
              currentGrid={currentGrid}
            />
          )}
        </div>
      </main>
      </div>

      {/* Metrics Modal */}
      {isMetricsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="bg-dashboard-bg border border-gray-600 w-full max-w-5xl h-full max-h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-dashboard-raised shrink-0">
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
            <div className="flex-1 overflow-hidden relative bg-dashboard-bg">
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
      {activeModalTool === 'jiraBugList' && (
        <JiraBugListGenerator onClose={() => setActiveModalTool(null)} />
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
