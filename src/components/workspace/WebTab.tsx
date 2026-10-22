import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, LogIn, RotateCw, X } from 'lucide-react';
import { useWorkspaceStore, type WorkspaceTab } from '../../store/useWorkspaceStore';
import { GAME_ENTRIES, toProxyUrl } from '../../config/gameEntries';
import { QA_LOGIN_FIELD_LABELS, planQaLogin, type QaLoginField } from '../../flows/qaLogin';
import { desktop } from '../../desktop';
import { BrowserFrame, type BrowserFrameHandle } from './BrowserFrame';

interface WebTabProps {
  tab: Extract<WorkspaceTab, { kind: 'web' }>;
  onLoadingChange: (loading: boolean) => void;
}

/** 遊戲入口分頁：模擬 Chrome 的工具列＋頁面（桌面版為真正的 Chromium 分頁，瀏覽器版為代理 iframe） */
export const WebTab: React.FC<WebTabProps> = ({ tab, onLoadingChange }) => {
  const navigateWeb = useWorkspaceStore(s => s.navigateWeb);
  const reloadWeb = useWorkspaceStore(s => s.reloadWeb);
  const setWebTitle = useWorkspaceStore(s => s.setWebTitle);
  const openQuickLogin = useWorkspaceStore(s => s.openQuickLogin);
  const notice = useWorkspaceStore(s => s.loginNotices[tab.id]);
  const setLoginNotice = useWorkspaceStore(s => s.setLoginNotice);
  const pendingLogin = useWorkspaceStore(s => s.pendingLogin);

  const frame = useRef<BrowserFrameHandle | null>(null);
  const loaded = useRef(false);
  const applying = useRef(false);
  const [url, setUrl] = useState<string | null>(null);
  /** 網址列輸入中的文字；null 表示沒在輸入，顯示目前頁面網址 */
  const [draft, setDraft] = useState<string | null>(null);

  const currentUrl = url ?? tab.url;

  const go = (raw: string) => {
    const next = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `http://${raw.trim()}`;
    if (desktop || toProxyUrl(next)) {
      navigateWeb(tab.id, next);
    } else {
      // 瀏覽器版只能代理入口站台，其他網址內嵌多半會被擋，直接開新分頁
      window.open(next, '_blank', 'noopener,noreferrer');
    }
  };

  /** 有排給這個分頁的快速登入、且頁面已載入時，填表（必要時送出） */
  const tryApplyLogin = useCallback(async () => {
    const { pendingLogin: p, setPendingLogin } = useWorkspaceStore.getState();
    if (!p || p.tabId !== tab.id || !loaded.current || applying.current || !frame.current) return;
    applying.current = true;
    try {
      const options = await frame.current.readLoginOptions();
      if (!options) {
        // 目前不在登入頁（例如已登入進大廳）：導回入口登入頁後再填一次
        const entry = GAME_ENTRIES.find(e => e.key === tab.entryKey);
        if (entry && !p.navigated) {
          setPendingLogin({ ...p, navigated: true });
          loaded.current = false;
          navigateWeb(tab.id, entry.url);
        } else {
          setPendingLogin(null);
          setLoginNotice(tab.id, { kind: 'warn', text: '這個頁面不是 QA 登入頁，無法自動填入。' });
        }
        return;
      }
      setPendingLogin(null);
      const plan = planQaLogin(options, p.values);
      const summary = (Object.entries(plan.applied) as [QaLoginField, string][]).map(([f, v]) => `${QA_LOGIN_FIELD_LABELS[f]}：${v}`).join('、');
      if (plan.missing.length > 0) {
        await frame.current.applyLogin(plan.choices, p.password, false);
        const names = plan.missing.map(f => `${QA_LOGIN_FIELD_LABELS[f]}（${p.values[f]?.join('、')}）`).join('、');
        setLoginNotice(tab.id, { kind: 'warn', text: `登入頁找不到對應選項，已填其他欄位但未送出：${names}` });
        return;
      }
      setLoginNotice(tab.id, { kind: 'ok', text: `${p.submit ? '已送出登入' : '已填入表單'}：${summary}` });
      await frame.current.applyLogin(plan.choices, p.password, p.submit);
    } finally {
      applying.current = false;
    }
  }, [tab.id, tab.entryKey, navigateWeb, setLoginNotice]);

  // 排入快速登入時，若頁面已載入就立即套用；否則等頁面載入完成
  useEffect(() => {
    if (pendingLogin?.tabId === tab.id) void tryApplyLogin();
  }, [pendingLogin, tab.id, tryApplyLogin]);

  const iconBtn = 'p-1.5 rounded-full text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover';

  return (
    <div className="h-full flex flex-col">
      {/* 工具列：上一頁 / 下一頁 / 重新整理 / 網址列 / 快速登入 / 新分頁開啟 */}
      <div className="h-11 flex items-center gap-1 px-2 border-b border-dashboard-border shrink-0">
        <button onClick={() => frame.current?.goBack()} title="上一頁" className={iconBtn}><ArrowLeft size={16} /></button>
        <button onClick={() => frame.current?.goForward()} title="下一頁" className={iconBtn}><ArrowRight size={16} /></button>
        <button onClick={() => { if (desktop) frame.current?.reload(); else { onLoadingChange(true); reloadWeb(tab.id); } }} title="重新整理" className={iconBtn}>
          <RotateCw size={15} />
        </button>
        <form
          className="flex-1 min-w-0"
          onSubmit={e => { e.preventDefault(); go(draft ?? currentUrl); setDraft(null); (document.activeElement as HTMLElement | null)?.blur(); }}
        >
          <input
            value={draft ?? currentUrl}
            onChange={e => setDraft(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={() => setDraft(null)}
            spellCheck={false}
            className="w-full h-8 px-3.5 rounded-full bg-dashboard-inset border border-transparent focus:border-dashboard-accent text-[13px] font-mono text-dashboard-text-primary outline-none"
          />
        </form>
        <button
          onClick={() => openQuickLogin(tab.id)}
          title="QA 快速登入：貼上測試項目自動填登入表單"
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium text-dashboard-accent hover:bg-dashboard-accent/10"
        >
          <LogIn size={14} /> 快速登入
        </button>
        <button onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')} title="在新分頁開啟（實際網址）" className={iconBtn}>
          <ExternalLink size={15} />
        </button>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 px-3 py-2 text-xs border-b border-dashboard-border shrink-0 ${notice.kind === 'ok' ? 'text-ok bg-ok/10' : 'text-warn bg-warn/10'}`}>
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setLoginNotice(tab.id, undefined)} title="關閉" className="p-0.5 rounded hover:bg-dashboard-hover"><X size={12} /></button>
        </div>
      )}

      {/* 內嵌頁面一律以淺色呈現，不受本工具日夜主題影響（同真正的 Chrome 分頁） */}
      <div className="flex-1 relative" style={{ background: '#fff', colorScheme: 'light' }}>
        <BrowserFrame
          ref={frame}
          url={tab.url}
          reloadKey={tab.reloadKey}
          title={tab.title}
          onUrlChange={setUrl}
          onTitleChange={title => setWebTitle(tab.id, title)}
          onLoadingChange={loading => { if (loading) loaded.current = false; onLoadingChange(loading); }}
          onLoaded={() => { loaded.current = true; void tryApplyLogin(); }}
        />
      </div>
    </div>
  );
};
