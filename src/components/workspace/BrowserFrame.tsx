import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { desktop, type WebviewElement } from '../../desktop';
import { fromProxyPath, toProxyUrl } from '../../config/gameEntries';
import {
  QA_LOGIN_READ_SCRIPT, applyQaLoginPlan, buildQaLoginApplyScript, readQaLoginOptions,
  type QaLoginField, type QaLoginPlan,
} from '../../flows/qaLogin';

/** 分頁內容的共同操作：桌面版是真正的 Chromium 分頁（webview），瀏覽器版是經代理的 iframe */
export interface BrowserFrameHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  /** 讀出 QA 登入頁各欄的選項；不是登入頁時為 null */
  readLoginOptions: () => Promise<Partial<Record<QaLoginField, string[]>> | null>;
  applyLogin: (choices: QaLoginPlan['choices'], password: string, submit: boolean) => Promise<void>;
}

interface BrowserFrameProps {
  /** 要載入的實際網址；與 reloadKey 一起變動時重新載入 */
  url: string;
  reloadKey: number;
  title: string;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onLoadingChange: (loading: boolean) => void;
  /** 頁面載入完成（可以讀寫 DOM 了） */
  onLoaded: () => void;
}

/** 桌面版：webview（獨立的 Chromium 分頁，不受 X-Frame-Options、第三方 Cookie 限制） */
const WebviewFrame = forwardRef<BrowserFrameHandle, BrowserFrameProps>(({ url, reloadKey, onUrlChange, onTitleChange, onLoadingChange, onLoaded }, ref) => {
  const view = useRef<WebviewElement | null>(null);
  const ready = useRef(false);
  const callbacks = useRef({ onUrlChange, onTitleChange, onLoadingChange, onLoaded });
  useEffect(() => { callbacks.current = { onUrlChange, onTitleChange, onLoadingChange, onLoaded }; });

  // 初始網址只在掛載時給一次，之後的導覽都用 loadURL（避免 React 重設 src 造成重新載入）
  const [initialUrl] = React.useState(url);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const cb = () => callbacks.current;
    const onStart = () => cb().onLoadingChange(true);
    const onStop = () => { cb().onLoadingChange(false); cb().onLoaded(); };
    const onNav = (e: Event) => cb().onUrlChange((e as Event & { url: string }).url);
    const onTitle = (e: Event) => cb().onTitleChange((e as Event & { title: string }).title);
    const onReady = () => { ready.current = true; };
    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('did-navigate', onNav);
    el.addEventListener('did-navigate-in-page', onNav);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('dom-ready', onReady);
    return () => {
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('did-navigate', onNav);
      el.removeEventListener('did-navigate-in-page', onNav);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('dom-ready', onReady);
    };
  }, []);

  // 網址列輸入或重新整理（reloadKey 變動）
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (ready.current) view.current?.loadURL(url).catch(() => { /* 使用者中途又導覽時會被取消，忽略 */ });
  }, [url, reloadKey]);

  useImperativeHandle(ref, () => ({
    goBack: () => { if (view.current?.canGoBack()) view.current.goBack(); },
    goForward: () => { if (view.current?.canGoForward()) view.current.goForward(); },
    reload: () => view.current?.reload(),
    readLoginOptions: async () => (ready.current && view.current ? view.current.executeJavaScript(QA_LOGIN_READ_SCRIPT) : null),
    applyLogin: async (choices, password, submit) => {
      await view.current?.executeJavaScript(buildQaLoginApplyScript(choices, password, submit));
    },
  }), []);

  return (
    <webview
      ref={el => { view.current = el as WebviewElement | null; }}
      src={initialUrl}
      // 所有入口分頁共用同一組 Cookie，並保留到下次開啟（登入狀態不會因關閉工具而消失）
      partition="persist:rngpay-web"
      // React 對非標準元素的布林屬性不輸出，需給字串
      {...({ allowpopups: 'true' } as object)}
      className="absolute inset-0 w-full h-full"
    />
  );
});

/** 讀 iframe 目前的實際網址（同源代理頁才讀得到；跳到外站時回傳 null） */
function readFrameUrl(frame: HTMLIFrameElement | null): string | null {
  try {
    const loc = frame?.contentWindow?.location;
    if (!loc || loc.href === 'about:blank') return null;
    return fromProxyPath(loc.pathname + loc.search + loc.hash) ?? loc.href;
  } catch {
    return null;
  }
}

/** 瀏覽器版：經開發伺服器代理的 iframe（見 vite.gameEntryProxy.ts） */
const IframeFrame = forwardRef<BrowserFrameHandle, BrowserFrameProps>(({ url, reloadKey, title, onUrlChange, onLoadingChange, onLoaded }, ref) => {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const doc = () => {
    try { return frame.current?.contentDocument ?? null; } catch { return null; }
  };

  useImperativeHandle(ref, () => ({
    goBack: () => { try { frame.current?.contentWindow?.history.back(); } catch { /* 外站頁面無法操作歷史 */ } },
    goForward: () => { try { frame.current?.contentWindow?.history.forward(); } catch { /* 同上 */ } },
    reload: () => { try { frame.current?.contentWindow?.location.reload(); } catch { /* 同上 */ } },
    readLoginOptions: async () => {
      const d = doc();
      return d && d.location.href !== 'about:blank' && d.readyState === 'complete' ? readQaLoginOptions(d) : null;
    },
    applyLogin: async (choices, password, submit) => {
      const d = doc();
      if (d) applyQaLoginPlan(d, choices, password, submit);
    },
  }), []);

  return (
    <iframe
      key={reloadKey}
      ref={frame}
      src={toProxyUrl(url) ?? url}
      title={title}
      onLoad={() => {
        onLoadingChange(false);
        const next = readFrameUrl(frame.current);
        if (next) onUrlChange(next);
        onLoaded();
      }}
      // 不給 allow-top-navigation：站內任何「跳到最上層」都不會蓋掉本工具
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
      allow="autoplay; fullscreen; clipboard-write"
      style={{ colorScheme: 'light', background: '#fff' }}
      className="absolute inset-0 w-full h-full border-0"
    />
  );
});

export const BrowserFrame = desktop ? WebviewFrame : IframeFrame;
