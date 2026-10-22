import { create } from 'zustand';
import { GAME_ENTRIES } from '../config/gameEntries';
import { resolveMenuSelection } from '../games/registry';
import { useGameStore, type GameState } from './useGameStore';
import { useMachineStore, type MachineState } from './useMachineStore';
import { configPanelCache } from './configPanelCache';
import type { QaLoginField } from '../flows/qaLogin';

/**
 * 主畫面分頁（類瀏覽器）：首頁固定一個，每開一款遊戲 / 一個遊戲入口就多一個分頁，一次只顯示一個。
 *
 * 遊戲狀態（useGameStore / useMachineStore）是全域單例，所以同一時間只有一個遊戲分頁是「現役」(liveGameTabId)：
 * 切到另一個遊戲分頁時，先把現役分頁的狀態存成快照，再還原目標分頁的快照，並以分頁 id 重新掛載設定面板與主控台。
 * 入口分頁與首頁不動遊戲狀態，切回來時遊戲畫面原封不動。
 */
export type WorkspaceTab =
  | { id: 'home'; kind: 'home'; title: string }
  | { id: string; kind: 'game'; title: string; /** 選單名稱（側欄 / 歡迎頁的項目名）；重複點同一項時切回此分頁 */ menuName: string }
  | { id: string; kind: 'web'; title: string; /** 從側欄入口開的分頁才有；遊戲彈出的新分頁為 null */ entryKey: string | null; /** 要載入的實際網址（瀏覽器版顯示時才轉成代理路徑） */ url: string; reloadKey: number };

interface GameTabSnapshot {
  game: GameState;
  machine: Pick<MachineState, 'gameType' | 'bet' | 'coin'>;
}

/** 等待某個入口分頁套用的快速登入（密碼只放記憶體，套用後即清除） */
export interface PendingQaLogin {
  tabId: string;
  values: Partial<Record<QaLoginField, string[]>>;
  password: string;
  submit: boolean;
  /** 已為了回到登入頁而重新導覽過（避免反覆導覽） */
  navigated?: boolean;
}

export interface QaLoginNotice {
  kind: 'ok' | 'warn';
  text: string;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string;
  /** 目前佔用全域遊戲狀態的遊戲分頁 */
  liveGameTabId: string | null;
  /** 開啟遊戲（範本或基底，名稱同側欄選單）：已有分頁就切過去 */
  openGame: (menuName: string) => void;
  /** 上傳 Excel：一律開新分頁 */
  openUpload: (file: File) => void;
  /** 開啟遊戲入口：已有分頁就切過去 */
  openWeb: (entryKey: string) => void;
  /** 以任意網址開新分頁（入口頁裡開新視窗時使用，例如大廳點進遊戲） */
  openUrl: (url: string) => void;
  selectTab: (id: string) => void;
  closeTab: (id: string) => void;
  navigateWeb: (id: string, url: string) => void;
  reloadWeb: (id: string) => void;
  /** 遊戲彈出的分頁以頁面標題命名（入口分頁維持入口名稱） */
  setWebTitle: (id: string, title: string) => void;

  /** 快速登入視窗；defaultTabId 為開啟時所在的入口分頁（測試單沒寫測試位置時套用到它） */
  quickLogin: { open: boolean; defaultTabId: string | null };
  openQuickLogin: (defaultTabId?: string | null) => void;
  closeQuickLogin: () => void;
  pendingLogin: PendingQaLogin | null;
  /** 開啟（或切到）入口分頁並排入快速登入 */
  requestLogin: (entryKey: string, login: Omit<PendingQaLogin, 'tabId'>) => void;
  setPendingLogin: (login: PendingQaLogin | null) => void;
  loginNotices: Record<string, QaLoginNotice | undefined>;
  setLoginNotice: (tabId: string, notice: QaLoginNotice | undefined) => void;
}

const HOME_TAB: WorkspaceTab = { id: 'home', kind: 'home', title: '首頁' };
const snapshots = new Map<string, GameTabSnapshot>();
let nextId = 1;
/** 分頁自己發出的載入要求，不需要下方的訂閱再處理 */
let internalTrigger = false;

function saveLive(liveId: string | null) {
  if (!liveId) return;
  const m = useMachineStore.getState();
  snapshots.set(liveId, { game: useGameStore.getState(), machine: { gameType: m.gameType, bet: m.bet, coin: m.coin } });
}

function restore(id: string) {
  const snap = snapshots.get(id);
  if (!snap) return;
  // 先切遊戲（會觸發 resetGameSpecifics），再整份覆寫回快照
  useMachineStore.setState(snap.machine);
  useGameStore.setState(snap.game, true);
}

/** 讓全域狀態回到「沒有載入專案」，給新分頁從頭載入 */
function resetForNewTab() {
  useMachineStore.setState({ loadTemplateTrigger: null, uploadedTemplateFile: null });
  useGameStore.getState().resetGameSpecifics();
  useGameStore.getState().clearProject();
  useGameStore.setState({ projectName: '', pendingSnippet: null, isProjectLoading: false });
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** 新增一個遊戲分頁並設為現役（由呼叫端接著觸發載入） */
  const addGameTab = (title: string, menuName: string) => {
    const { liveGameTabId } = get();
    saveLive(liveGameTabId);
    resetForNewTab();
    const tab: WorkspaceTab = { id: `game#${nextId++}`, kind: 'game', title, menuName };
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id, liveGameTabId: tab.id }));
  };

  /** 切到某分頁；若是非現役的遊戲分頁就換入它的狀態 */
  const activate = (id: string) => {
    const { tabs, liveGameTabId } = get();
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    if (tab.kind === 'game' && id !== liveGameTabId) {
      saveLive(liveGameTabId);
      restore(id);
      set({ activeTabId: id, liveGameTabId: id });
      return;
    }
    set({ activeTabId: id });
  };

  return {
    tabs: [HOME_TAB],
    activeTabId: 'home',
    liveGameTabId: null,

    openGame: (menuName) => {
      const existing = get().tabs.find(t => t.kind === 'game' && t.menuName === menuName);
      if (existing) { activate(existing.id); return; }
      addGameTab(menuName, menuName);
      const [gameType, trigger] = resolveMenuSelection(menuName);
      if (gameType) useMachineStore.getState().setGameType(gameType);
      internalTrigger = true;
      try { useMachineStore.getState().setLoadTemplateTrigger(trigger); } finally { internalTrigger = false; }
    },

    openUpload: (file) => {
      const name = file.name.replace(/\.[^/.]+$/, '');
      addGameTab(name, `upload:${name}#${nextId}`);
      useMachineStore.getState().setUploadedTemplateFile(file);
    },

    openWeb: (entryKey) => {
      const existing = get().tabs.find(t => t.kind === 'web' && t.entryKey === entryKey);
      if (existing) { activate(existing.id); return; }
      const entry = GAME_ENTRIES.find(e => e.key === entryKey);
      if (!entry) return;
      const tab: WorkspaceTab = {
        id: `web#${nextId++}`, kind: 'web', title: entry.name, entryKey, url: entry.url, reloadKey: 0,
      };
      set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    },

    openUrl: (url) => {
      let title = url;
      try { title = new URL(url).hostname; } catch { /* 保留原字串 */ }
      const tab: WorkspaceTab = { id: `web#${nextId++}`, kind: 'web', title, entryKey: null, url, reloadKey: 0 };
      set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    },

    selectTab: activate,

    closeTab: (id) => {
      if (id === 'home') return;
      const { tabs, activeTabId, liveGameTabId } = get();
      const idx = tabs.findIndex(t => t.id === id);
      const remaining = tabs.filter(t => t.id !== id);
      snapshots.delete(id);
      configPanelCache.delete(id);
      if (id === liveGameTabId) {
        // 現役遊戲被關：交給最近的另一個遊戲分頁接手，沒有就清空專案
        const nextGame = [...remaining.slice(idx), ...remaining.slice(0, idx).reverse()].find(t => t.kind === 'game');
        if (nextGame) restore(nextGame.id); else resetForNewTab();
        const nextActive = activeTabId === id ? (nextGame?.id ?? remaining[Math.min(idx, remaining.length - 1)].id) : activeTabId;
        set({ tabs: remaining, liveGameTabId: nextGame?.id ?? null, activeTabId: nextActive });
        return;
      }
      if (activeTabId === id) {
        set({ tabs: remaining });
        activate(remaining[Math.min(idx, remaining.length - 1)].id);
        return;
      }
      set({ tabs: remaining });
    },

    navigateWeb: (id, url) => set(s => ({
      // 一併換 reloadKey：頁面內已自行跳頁時，網址不變也要能導回去
      tabs: s.tabs.map(t => t.id === id && t.kind === 'web' ? { ...t, url, reloadKey: t.reloadKey + 1 } : t),
    })),
    reloadWeb: (id) => set(s => ({
      tabs: s.tabs.map(t => t.id === id && t.kind === 'web' ? { ...t, reloadKey: t.reloadKey + 1 } : t),
    })),
    setWebTitle: (id, title) => set(s => ({
      tabs: s.tabs.map(t => t.id === id && t.kind === 'web' && !t.entryKey && title ? { ...t, title } : t),
    })),

    quickLogin: { open: false, defaultTabId: null },
    openQuickLogin: (defaultTabId = null) => set({ quickLogin: { open: true, defaultTabId } }),
    closeQuickLogin: () => set(s => ({ quickLogin: { ...s.quickLogin, open: false } })),
    pendingLogin: null,
    requestLogin: (entryKey, login) => {
      get().openWeb(entryKey);
      const tab = get().tabs.find(t => t.kind === 'web' && t.entryKey === entryKey);
      if (tab) set(s => ({ pendingLogin: { ...login, tabId: tab.id }, loginNotices: { ...s.loginNotices, [tab.id]: undefined } }));
    },
    setPendingLogin: (login) => set({ pendingLogin: login }),
    loginNotices: {},
    setLoginNotice: (tabId, notice) => set(s => ({ loginNotices: { ...s.loginNotices, [tabId]: notice } })),
  };
});

// 其他入口（腳本庫套用腳本、RTP 計算機 / RNG 驗證切範本）會直接要求載入範本：
// 正在看首頁或入口時，帶到現役遊戲分頁；還沒有遊戲分頁就為它開一個。
useMachineStore.subscribe((state, prev) => {
  const trigger = state.loadTemplateTrigger;
  if (internalTrigger || !trigger || trigger === prev.loadTemplateTrigger) return;
  const ws = useWorkspaceStore.getState();
  const active = ws.tabs.find(t => t.id === ws.activeTabId);
  if (active?.kind === 'game') {
    // 在遊戲分頁內換了範本：分頁名稱跟著換（基底遊戲的 trigger 是「預設泛用」，維持原名）
    if (trigger !== '預設泛用') {
      useWorkspaceStore.setState({
        tabs: ws.tabs.map(t => t.id === active.id && t.kind === 'game' ? { ...t, menuName: trigger, title: trigger } : t),
      });
    }
    return;
  }
  if (ws.liveGameTabId) { useWorkspaceStore.setState({ activeTabId: ws.liveGameTabId }); return; }
  const tab: WorkspaceTab = { id: `game#${nextId++}`, kind: 'game', title: trigger, menuName: trigger };
  useWorkspaceStore.setState({ tabs: [...ws.tabs, tab], activeTabId: tab.id, liveGameTabId: tab.id });
});
