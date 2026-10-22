import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { SlotConsole } from './components/SlotConsole';
import { MetricsDashboard } from './components/MetricsDashboard';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './hooks/useTheme';
import { BarChart3, Menu, Moon, PanelLeftOpen, PanelLeftClose, SlidersHorizontal, Sun, X } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Sidebar } from './components/Sidebar';
import { WorkspaceTabBar } from './components/workspace/WorkspaceTabBar';
import { WebTab } from './components/workspace/WebTab';
import { QuickLoginDialog } from './components/workspace/QuickLoginDialog';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { desktop } from './desktop';
import type { GameConfig } from './types';
import { useMachineStore } from './store/useMachineStore';
import { useGameStore } from './store/useGameStore';
import { getManifest, getTraits } from './games/registry';


type ToolModal = ComponentType<{ onClose: () => void }>;
const lazyTool = (load: () => Promise<Record<string, ToolModal>>, name: string) =>
  lazy(() => load().then(m => ({ default: m[name] })));
const TOOL_MODALS: Record<string, LazyExoticComponent<ToolModal>> = {
  jira: lazyTool(() => import('./components/tools/JiraLinkGenerator'), 'JiraLinkGenerator'),
  snippet: lazyTool(() => import('./components/tools/SnippetLibrary'), 'SnippetLibrary'),
  jiraReport: lazyTool(() => import('./components/tools/JiraReportGenerator'), 'JiraReportGenerator'),
  jiraReportWeb: lazyTool(() => import('./components/tools/JiraReportGeneratorWeb'), 'JiraReportGeneratorWeb'),
  jiraBugList: lazyTool(() => import('./components/tools/JiraBugListGenerator'), 'JiraBugListGenerator'),
  rngValidator: lazyTool(() => import('./components/tools/RngValidator'), 'RngValidator'),
  rtpCalculator: lazyTool(() => import('./components/tools/RtpCalculator'), 'RtpCalculator'),
};
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
  
  const activeModalTool = useMachineStore(state => state.activeModalTool);
  const setActiveModalTool = useMachineStore(state => state.setActiveModalTool);
  
  const [isMetricsOpen, setIsMetricsOpen] = useState<boolean>(false);
  const projectName = useGameStore(state => state.projectName);

  // 側欄：桌面可收合（記住偏好），小螢幕為抽屜
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('rngpay.sidebarCollapsed') === '1'; } catch { return false; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // 設定面板可收合（設定通常一次調好，之後專注在主控台），偏好記在 localStorage；收合時保持掛載以保留狀態
  const [configCollapsed, setConfigCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('rngpay.configCollapsed') === '1'; } catch { return false; }
  });
  const toggleConfig = useCallback(() => {
    setConfigCollapsed(prev => {
      try { localStorage.setItem('rngpay.configCollapsed', prev ? '0' : '1'); } catch { /* 無痕模式 */ }
      return !prev;
    });
  }, []);
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

  // 主畫面分頁：首頁、遊戲（共用一份全域遊戲狀態，切換時換入快照）、遊戲入口
  const tabs = useWorkspaceStore(state => state.tabs);
  const activeTabId = useWorkspaceStore(state => state.activeTabId);
  const liveGameTabId = useWorkspaceStore(state => state.liveGameTabId);
  const openGame = useWorkspaceStore(state => state.openGame);
  const activeKind = tabs.find(t => t.id === activeTabId)?.kind ?? 'home';
  const isProjectLoading = useGameStore(state => state.isProjectLoading);
  const [webLoading, setWebLoading] = useState<Record<string, boolean>>({});

  // 桌面版：入口分頁裡開新視窗（例如大廳點遊戲）→ 在工具內開一個新分頁
  useEffect(() => desktop?.onOpenWebTab(url => useWorkspaceStore.getState().openUrl(url)), []);
  const tabLoading = liveGameTabId && isProjectLoading ? { ...webLoading, [liveGameTabId]: true } : webLoading;

  const handleTestSpin = useCallback((strips: any[], paytable: any[], spins?: number, rows?: number[], paylines?: number[][], isFreeGame?: boolean) => {
    const config: GameConfig = {
      gameType,
      paylines: paylines || customPaylines,
      effectiveBet: bet,
      specialRules: {
        unremovableSymbols: ['S1']
      }
    };
    const { currentStripSets, currentFreeStripSets } = useGameStore.getState();
    runSimulation(strips, paytable, spins, rows, config, coin, bet, isFreeGame, undefined, undefined, currentStripSets, currentFreeStripSets);
  }, [runSimulation, gameType, customPaylines, coin, bet]);

  const handleDashboardRunSimulation = useCallback(() => {
    const config: GameConfig = {
      gameType,
      paylines: customPaylines,
      effectiveBet: bet,
      specialRules: {
        unremovableSymbols: ['S1']
      }
    };
    // We don't have activeStripTab here, so we assume Base Game if run from Dashboard directly
    const { currentStripSets, currentFreeStripSets } = useGameStore.getState();
    runSimulation(currentStrips, currentPaytable, 100000, rowCounts, config, coin, bet, false, undefined, undefined, currentStripSets, currentFreeStripSets);
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
          {activeKind === 'game' && isProjectLoaded && (
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
        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden xl:block mr-2 text-[11px] font-mono text-dashboard-text-muted">Slot Math QA Toolkit</span>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? '切換為淺色主題' : '切換為深色主題'}
            aria-label="切換日夜主題"
            className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-dashboard-border bg-dashboard-card text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover text-xs font-medium"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span className="hidden sm:inline">{theme === 'dark' ? '淺色' : '深色'}</span>
          </button>
        </div>
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

        <WorkspaceTabBar loading={tabLoading} />

        <div className="flex-1 min-h-0 relative">
          {/* 首頁 */}
          {activeKind === 'home' && <WelcomeScreen onSelectTemplate={openGame} />}

          {/* 遊戲：同一時間只掛載現役的遊戲分頁，切到首頁 / 入口時只隱藏不卸載 */}
          {liveGameTabId && (
            <div className={`absolute inset-0 flex flex-col ${activeKind === 'game' ? '' : 'hidden'}`}>
            {/* Main Grid Layout：寬螢幕左右並排，窄螢幕上下堆疊並整頁捲動 */}
            <main key={liveGameTabId} className="flex-1 w-full flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
              {/* Left: ConfigPanel（桌面可收合為窄欄） */}
            <div 
              className={`
                relative w-full shrink-0 h-[80dvh] lg:h-full transition-[width] duration-200
                ${configCollapsed ? 'lg:w-11' : getTraits(gameType).mathIdGenerator ? 'lg:w-[340px]' : 'lg:w-[clamp(340px,32%,460px)]'}
              `}
            >
              <div className={`h-full ${configCollapsed ? 'lg:hidden' : ''}`}>
                <ConfigPanel 
                  onTestSpin={handleTestSpin}
                />
              </div>
              {configCollapsed ? (
                <button
                  onClick={toggleConfig}
                  title="展開遊戲設定"
                  className="hidden lg:flex h-full w-full flex-col items-center gap-3 pt-3 bg-dashboard-card border-r border-dashboard-border text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover"
                >
                  <PanelLeftOpen size={17} />
                  <SlidersHorizontal size={15} />
                  <span className="[writing-mode:vertical-rl] text-xs font-medium tracking-widest">遊戲設定</span>
                </button>
              ) : (
                <button
                  onClick={toggleConfig}
                  title="收合遊戲設定"
                  className="hidden lg:inline-flex absolute top-3 right-3 z-10 p-1.5 rounded-md text-dashboard-text-muted hover:text-dashboard-text-primary hover:bg-dashboard-hover"
                >
                  <PanelLeftClose size={16} />
                </button>
              )}
            </div>

            {/* Center: SlotConsole or WelcomeScreen */}
            <div className={`w-full flex-1 min-w-0 lg:h-full ${isProjectLoaded ? 'min-h-[85dvh] lg:min-h-0' : 'h-full'}`}>
              {!isProjectLoaded ? (
                <div className="h-full flex items-center justify-center gap-2 text-sm text-dashboard-text-muted">
                  {isProjectLoading ? '範本載入中…' : '尚未載入範本'}
                </div>
              ) : (
                <SlotConsole 
                  currentGrid={currentGrid}
                />
              )}
            </div>
          </main>
            </div>
          )}

          {/* 遊戲入口：每個分頁保持掛載，切換時保留登入狀態 */}
          {tabs.map(t => t.kind === 'web' && (
            <div key={t.id} className={`absolute inset-0 ${t.id === activeTabId ? '' : 'invisible'}`}>
              <WebTab tab={t} onLoadingChange={loading => setWebLoading(prev => ({ ...prev, [t.id]: loading }))} />
            </div>
          ))}
        </div>
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
                className="text-gray-400 hover:text-dashboard-text-primary p-1 rounded-md hover:bg-gray-800 transition-colors"
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

      {/* QA 快速登入（側欄「遊戲入口」或入口分頁工具列開啟） */}
      <QuickLoginDialog />

      {/* Tools Modals（打開時才載入；JIRA 匯出工具含 exceljs，不放進首頁 bundle） */}
      {activeModalTool && TOOL_MODALS[activeModalTool] && (() => {
        const Tool = TOOL_MODALS[activeModalTool];
        return (
          <Suspense fallback={null}>
            <Tool onClose={() => setActiveModalTool(null)} />
          </Suspense>
        );
      })()}
    </div>
  );
}

export default App;
