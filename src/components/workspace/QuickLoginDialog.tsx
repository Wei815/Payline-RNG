import React, { useMemo, useState } from 'react';
import { LogIn, X } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { GAME_ENTRIES } from '../../config/gameEntries';
import { DEFAULT_ACCOUNTS, QA_LOGIN_FIELD_LABELS, parseQaLoginSpec, pickOption, type QaLoginField } from '../../flows/qaLogin';

const ACCOUNT_KEY = 'rngpay.qaLoginAccount';
const SPEC_KEY = 'rngpay.qaLoginSpec';

/** 「全…」時預覽要選的項目（實際以登入頁選項為準） */
const ALL_PREVIEW: Partial<Record<QaLoginField, string>> = { lang: '繁', currency: '台灣 ( NT )' };

/** 預覽：多選 / 全選時會挑哪一個 */
function previewPick(field: QaLoginField, values: string[]): string {
  if (values.length === 1 && /^全/.test(values[0])) return ALL_PREVIEW[field] ?? '第一個選項';
  return values[pickOption(field, values, values)] ?? values[0];
}

const findEntryByUrl = (url: string) => {
  try {
    const origin = new URL(url).origin;
    return GAME_ENTRIES.find(e => new URL(e.url).origin === origin);
  } catch {
    return undefined;
  }
};

const readLocal = (key: string, fallback: string) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const writeLocal = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* 無痕模式 */ }
};

/** 快速登入：貼上測試單的「測試項目」，選身分、輸入密碼，自動在對應入口分頁填好登入表單 */
export const QuickLoginDialog: React.FC = () => {
  const { open, defaultTabId } = useWorkspaceStore(s => s.quickLogin);
  const tabs = useWorkspaceStore(s => s.tabs);
  const closeQuickLogin = useWorkspaceStore(s => s.closeQuickLogin);
  const requestLogin = useWorkspaceStore(s => s.requestLogin);

  const [text, setText] = useState(() => readLocal(SPEC_KEY, ''));
  const [account, setAccount] = useState(() => readLocal(ACCOUNT_KEY, 'QA1'));
  // 密碼只留在記憶體，不寫入瀏覽器儲存
  const [password, setPassword] = useState('');

  const spec = useMemo(() => parseQaLoginSpec(text), [text]);
  const fields = Object.keys(spec.values) as QaLoginField[];

  // 目標入口：測試單的測試位置；沒寫就用開啟視窗時所在的入口分頁
  const defaultTab = tabs.find(t => t.id === defaultTabId && t.kind === 'web');
  const entry = spec.url
    ? findEntryByUrl(spec.url)
    : GAME_ENTRIES.find(e => defaultTab?.kind === 'web' && e.key === defaultTab.entryKey);
  const targetError = spec.url && !entry
    ? `測試位置不在「遊戲入口」清單內：${spec.url}`
    : !entry ? '請貼上含「測試位置」的測試項目，或從入口分頁開啟此視窗' : null;

  if (!open) return null;

  const submit = (doLogin: boolean) => {
    if (!entry) return;
    writeLocal(SPEC_KEY, text);
    writeLocal(ACCOUNT_KEY, account);
    requestLogin(entry.key, { values: { ...spec.values, account: [account] }, password, submit: doLogin });
    setPassword('');
    closeQuickLogin();
  };

  const input = 'w-full h-9 px-3 rounded-md bg-dashboard-inset border border-dashboard-border focus:border-dashboard-accent text-sm text-dashboard-text-primary outline-none';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) closeQuickLogin(); }}>
      <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-dashboard-card border border-dashboard-border rounded-xl shadow-2xl">
        <div className="h-12 flex items-center justify-between px-4 border-b border-dashboard-border shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm"><LogIn size={16} className="text-dashboard-accent" /> QA 快速登入</div>
          <button onClick={closeQuickLogin} title="關閉" className="p-1.5 rounded-md text-dashboard-text-secondary hover:bg-dashboard-hover"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-dashboard-text-secondary">測試項目（從測試單貼上）</span>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
              spellCheck={false}
              placeholder={'測試位置\thttp://qa-royalgameweb-cocos.rsg-games.com/QALogin\nServer\tSlot-7778(Group2-QA)\n用戶來源\tCocos斷線續玩, Cocos無斷線續玩\n語系\t全語系\n幣別\t全幣別'}
              className="w-full px-3 py-2 rounded-md bg-dashboard-inset border border-dashboard-border focus:border-dashboard-accent text-[13px] font-mono text-dashboard-text-primary outline-none resize-y"
            />
          </label>

          {/* 解析結果預覽 */}
          <div className="rounded-lg border border-dashboard-border overflow-hidden">
            <div className="px-3 py-2 text-xs bg-dashboard-inset text-dashboard-text-secondary flex justify-between gap-2">
              <span>套用到：{entry ? <b className="text-dashboard-text-primary">{entry.name}</b> : '—'}</span>
              <span className="text-dashboard-text-muted">多選時優先：無斷線續玩、繁、台灣 (NT)</span>
            </div>
            {targetError && <div className="px-3 py-2 text-xs text-warn border-t border-dashboard-border">{targetError}</div>}
            {fields.length > 0 && (
              <table className="w-full text-[13px]">
                <tbody>
                  {fields.map(f => {
                    const values = spec.values[f]!;
                    const pick = previewPick(f, values);
                    const multi = values.length > 1 || /^全/.test(values[0]);
                    return (
                      <tr key={f} className="border-t border-dashboard-border">
                        <td className="px-3 py-1.5 w-24 text-dashboard-text-secondary">{QA_LOGIN_FIELD_LABELS[f]}</td>
                        <td className="px-3 py-1.5 text-dashboard-text-muted">{multi ? values.join('、') : ''}</td>
                        <td className="px-3 py-1.5 font-medium">{multi ? '→ ' : ''}{pick}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-dashboard-text-secondary">身分</span>
              <select value={account} onChange={e => setAccount(e.target.value)} className={input}>
                {DEFAULT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-dashboard-text-secondary">通關密碼</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && entry) submit(true); }}
                autoComplete="off"
                className={input}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-dashboard-border shrink-0">
          <button
            onClick={() => submit(false)}
            disabled={!entry}
            className="h-9 px-4 rounded-md border border-dashboard-border text-sm text-dashboard-text-secondary hover:bg-dashboard-hover disabled:opacity-50"
          >
            只填入表單
          </button>
          <button
            onClick={() => submit(true)}
            disabled={!entry}
            className="h-9 px-4 rounded-md bg-dashboard-accent text-dashboard-on-accent text-sm font-medium hover:bg-dashboard-accent-strong disabled:opacity-50"
          >
            填入並登入
          </button>
        </div>
      </div>
    </div>
  );
};
