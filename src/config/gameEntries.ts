/** 側欄「遊戲入口」：外部測試環境的登入頁，點擊後在右側內嵌瀏覽器開啟 */
export interface GameEntry {
  /** 代理路徑代號：開發伺服器以 /rg/<key>/ 轉發到該站（見 vite.config.ts） */
  key: string;
  name: string;
  url: string;
}

export const GAME_ENTRIES: GameEntry[] = [
  { key: 'qa-egret', name: 'UAT - Egret', url: 'http://qa-royalgameweb.rsg-games.com/QALogin' },
  { key: 'dev-egret', name: 'DEV - Egret', url: 'http://dev-royalgameweb.rsg-games.com/QALogin' },
  { key: 'qa-cocos', name: 'UAT - Cocos', url: 'http://qa-royalgameweb-cocos.rsg-games.com/QALogin' },
  { key: 'dev-cocos', name: 'DEV - Cocos', url: 'http://dev-royalgameweb-cocos.rsg-games.com/QALogin' },
  { key: 'sgt-qa', name: 'SGT QA Mode（打款）', url: 'http://qa-royalgamesgtqa.rsg-games.com/Login' },
];

export const GAME_ENTRY_PROXY_ROOT = '/rg';

export const entryProxyPrefix = (e: GameEntry) => `${GAME_ENTRY_PROXY_ROOT}/${e.key}`;

/** 實際網址 → 代理網址（不屬於任何入口站台時回傳 null） */
export function toProxyUrl(realUrl: string): string | null {
  let u: URL;
  try { u = new URL(realUrl); } catch { return null; }
  const entry = GAME_ENTRIES.find(e => new URL(e.url).origin === u.origin);
  return entry ? `${entryProxyPrefix(entry)}${u.pathname}${u.search}${u.hash}` : null;
}

/** 代理路徑 → 實際網址（網址列顯示用；非代理路徑回傳 null） */
export function fromProxyPath(pathWithQuery: string): string | null {
  for (const e of GAME_ENTRIES) {
    const prefix = entryProxyPrefix(e);
    if (pathWithQuery === prefix || pathWithQuery.startsWith(prefix + '/')) {
      return new URL(e.url).origin + (pathWithQuery.slice(prefix.length) || '/');
    }
  }
  return null;
}
