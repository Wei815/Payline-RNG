import React from 'react';
import { FileBox, Globe, Home, RotateCw, X } from 'lucide-react';
import { useWorkspaceStore, type WorkspaceTab } from '../../store/useWorkspaceStore';

interface WorkspaceTabBarProps {
  /** 正在載入的入口分頁 */
  loading: Record<string, boolean>;
}

const tabIcon = (tab: WorkspaceTab, loading: boolean) => {
  if (loading) return <RotateCw size={13} className="shrink-0 animate-spin text-dashboard-accent" />;
  if (tab.kind === 'home') return <Home size={13} className="shrink-0" />;
  if (tab.kind === 'web') return <Globe size={13} className="shrink-0" />;
  return <FileBox size={13} className="shrink-0" />;
};

/** 主畫面分頁列（Chrome 風格）：首頁固定在最左且不可關閉；中鍵也可關閉分頁 */
export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({ loading }) => {
  const tabs = useWorkspaceStore(s => s.tabs);
  const activeTabId = useWorkspaceStore(s => s.activeTabId);
  const selectTab = useWorkspaceStore(s => s.selectTab);
  const closeTab = useWorkspaceStore(s => s.closeTab);

  return (
    <div className="h-10 flex items-end gap-0.5 px-2 pt-1.5 bg-dashboard-inset border-b border-dashboard-border shrink-0 overflow-x-auto [scrollbar-width:none]">
      {tabs.map(t => {
        const active = t.id === activeTabId;
        const closable = t.kind !== 'home';
        return (
          <div
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => selectTab(t.id)}
            onAuxClick={e => { if (e.button === 1 && closable) closeTab(t.id); }}
            title={t.title}
            className={`group h-8 flex items-center gap-2 rounded-t-lg text-xs cursor-default select-none shrink-0
              ${t.kind === 'home' ? 'px-3' : 'w-[200px] pl-3 pr-1.5'}
              ${active
                ? 'bg-dashboard-bg text-dashboard-text-primary border border-b-0 border-dashboard-border'
                : 'text-dashboard-text-secondary hover:bg-dashboard-hover'}`}
          >
            {tabIcon(t, !!loading[t.id])}
            <span className="truncate flex-1">{t.title}</span>
            {closable && (
              <button
                onClick={e => { e.stopPropagation(); closeTab(t.id); }}
                title="關閉分頁"
                className="p-0.5 rounded-full text-dashboard-text-muted hover:text-dashboard-text-primary hover:bg-dashboard-border"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
