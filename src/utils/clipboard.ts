/**
 * 複製文字到剪貼簿
 *
 * Clipboard API 在頁面沒有焦點、或非 https 環境時會拒絕（曾產生未處理的 NotAllowedError），
 * 失敗時改用舊式 execCommand('copy') 備援；回傳是否成功，不會拋錯。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return true;
    } catch {
      // 備援也失敗，下方記錄原始錯誤
    }
    console.warn('複製到剪貼簿失敗', e);
    return false;
  }
}
