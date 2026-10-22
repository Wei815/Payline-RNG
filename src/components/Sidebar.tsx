import React from 'react';
import { Home, Play, FileBox, Calculator, FileCheck2, Link as LinkIcon, FileSpreadsheet, Upload, PanelLeftClose, PanelLeftOpen, X, ExternalLink } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useMachineStore } from '../store/useMachineStore';
import { ENGINE_MENU, TEMPLATE_MENU, resolveMenuSelection } from '../games/registry';
import { GAME_ENTRIES } from '../config/gameEntries';

export interface SidebarProps {
  /** 桌面版：只顯示圖示的窄欄 */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** 小螢幕：抽屜是否開啟 */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  action: () => void;
  active?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) => {
  const clearProject = useGameStore(state => state.clearProject);
  const isProjectLoaded = useGameStore(state => state.isProjectLoaded);
  const projectName = useGameStore(state => state.projectName);
  const gameType = useMachineStore(state => state.gameType);
  const setLoadTemplateTrigger = useMachineStore(state => state.setLoadTemplateTrigger);
  const setGameType = useMachineStore(state => state.setGameType);

  const run = (fn: () => void) => () => {
    fn();
    onCloseMobile();
  };

  const handleSelectTemplate = (templateName: string) => {
    const [targetGameType, trigger] = resolveMenuSelection(templateName);
    if (targetGameType) setGameType(targetGameType);
    setLoadTemplateTrigger(trigger);
  };

  const openTool = (tool: Parameters<ReturnType<typeof useMachineStore.getState>['setActiveModalTool']>[0]) =>
    useMachineStore.getState().setActiveModalTool(tool);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: '遊戲基底',
      items: ENGINE_MENU.map(e => ({
        name: e.name,
        icon: <Play size={16} />,
        action: run(() => handleSelectTemplate(e.name)),
        active: isProjectLoaded && projectName === '預設泛用' && gameType === e.id,
      })),
    },
    {
      title: '遊戲範本',
      items: [
        { name: '上傳自訂 Excel', icon: <Upload size={16} />, action: run(() => document.getElementById('sidebar-file-upload')?.click()) },
        ...TEMPLATE_MENU.map(t => ({
          name: t.name,
          icon: <FileBox size={16} />,
          action: run(() => handleSelectTemplate(t.name)),
          active: isProjectLoaded && !!projectName && projectName.includes(t.name) && gameType === t.id,
        })),
      ],
    },
    {
      title: '小工具',
      items: [
        { name: 'JIRA 出測 Bug list 工具', icon: <FileSpreadsheet size={16} />, action: run(() => openTool('jiraBugList')) },
        { name: 'JIRA 出測 BUG 備註工具', icon: <LinkIcon size={16} />, action: run(() => openTool('jira')) },
        { name: '測試腳本庫', icon: <FileBox size={16} />, action: run(() => openTool('snippet')) },
        { name: 'Jira CSV 報表轉換器', icon: <FileSpreadsheet size={16} />, action: run(() => openTool('jiraReport')) },
        { name: 'RTP 模擬計算機', icon: <Calculator size={16} />, action: run(() => openTool('rtpCalculator')) },
        { name: 'RNG 腳本驗證', icon: <FileCheck2 size={16} />, action: run(() => openTool('rngValidator')) },
      ],
    },
    {
      title: '遊戲入口',
      items: GAME_ENTRIES.map(e => ({
        name: e.name,
        icon: <ExternalLink size={16} />,
        action: run(() => window.open(e.url, '_blank', 'noopener,noreferrer')),
      })),
    },
  ];

  // 抽屜模式（小螢幕）一律展開顯示文字
  const showLabels = !collapsed || mobileOpen;

  const nav = (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar">
      <button
        onClick={run(() => clearProject())}
        title="新專案 / 首頁"
        className={`flex items-center gap-3 h-10 mb-4 rounded-lg border border-dashboard-border bg-dashboard-card text-dashboard-text-primary hover:border-dashboard-accent/60 hover:text-dashboard-accent transition-colors w-full text-sm font-semibold
          ${showLabels ? 'px-3' : 'justify-center'}`}
      >
        <Home size={17} className="text-dashboard-accent shrink-0" />
        {showLabels && <span className="truncate">新專案 / 首頁</span>}
      </button>

      {sections.map(section => (
        <div key={section.title} className="mb-4">
          {showLabels ? (
            <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-dashboard-text-muted">{section.title}</div>
          ) : (
            <div className="mx-3 mb-2 border-t border-dashboard-border" />
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map(item => (
              <button
                key={item.name}
                onClick={item.action}
                title={item.name}
                aria-current={item.active ? 'page' : undefined}
                className={`relative flex items-center gap-3 h-9 rounded-md text-[13px] font-medium w-full text-left transition-colors
                  ${showLabels ? 'px-3' : 'justify-center'}
                  ${item.active
                    ? 'bg-dashboard-accent/10 text-dashboard-accent'
                    : 'text-dashboard-text-secondary hover:bg-dashboard-hover hover:text-dashboard-text-primary'}`}
              >
                {item.active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-dashboard-accent" />}
                <span className="shrink-0">{item.icon}</span>
                {showLabels && <span className="truncate">{item.name}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}

      <input
        type="file"
        id="sidebar-file-upload"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            useMachineStore.getState().setUploadedTemplateFile(file);
            e.target.value = ''; // Reset
          }
        }}
      />
    </nav>
  );

  return (
    <>
      {/* 桌面版側欄 */}
      <aside
        className={`hidden lg:flex h-full flex-col shrink-0 bg-dashboard-bg border-r border-dashboard-border transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <div className={`h-14 flex items-center shrink-0 border-b border-dashboard-border ${collapsed ? 'justify-center' : 'justify-end px-3'}`}>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? '展開側欄' : '收合側欄'}
            className="p-1.5 rounded-md text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover transition-colors"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        {!mobileOpen && nav}
      </aside>

      {/* 小螢幕抽屜 */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onCloseMobile} />
          <aside className="relative w-72 max-w-[85vw] h-full flex flex-col bg-dashboard-bg border-r border-dashboard-border shadow-2xl">
            <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-dashboard-border">
              <span className="font-semibold tracking-wide"><span className="text-dashboard-accent">RNG</span> PAY</span>
              <button onClick={onCloseMobile} className="p-1.5 rounded-md text-dashboard-text-secondary hover:bg-dashboard-hover" title="關閉選單">
                <X size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
};
