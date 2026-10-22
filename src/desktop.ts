/** 桌面版（Electron，見 electron/preload.cjs）提供的 API；瀏覽器版為 null */
export interface DesktopApi {
  isDesktop: true;
  onOpenWebTab: (callback: (url: string) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
}

export const desktop: DesktopApi | null =
  (globalThis as unknown as { rngpayDesktop?: DesktopApi }).rngpayDesktop ?? null;

/** Electron <webview> 元素（只列出用到的方法） */
export interface WebviewElement extends HTMLElement {
  src: string;
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  reload: () => void;
  executeJavaScript: <T = unknown>(code: string) => Promise<T>;
}
