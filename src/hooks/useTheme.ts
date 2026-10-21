import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'rngpay.theme';

/** 目前主題（index.html 開頭的 script 已在第一次繪製前設定好 data-theme，避免閃爍） */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** 日 / 夜主題：使用者選擇會記住；未選擇過則跟隨作業系統 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const apply = useCallback((next: Theme, animate: boolean) => {
    const root = document.documentElement;
    if (animate) {
      root.classList.add('theme-transition');
      window.setTimeout(() => root.classList.remove('theme-transition'), 250);
    }
    root.dataset.theme = next;
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* 無痕模式 */ }
    apply(next, true);
  }, [apply]);

  // 使用者沒有手動選過時，跟著作業系統切換
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* 無痕模式 */ }
      if (!saved) apply(mq.matches ? 'light' : 'dark', true);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [apply]);

  return { theme, toggleTheme };
}
