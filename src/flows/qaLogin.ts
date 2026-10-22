/**
 * QA 登入頁（Royal Game QALogin）快速登入：把測試單上的「測試項目」文字轉成登入頁各欄的選擇。
 *
 * 測試單格式（每行「欄位<Tab>值」，值可多選以逗號分隔）：
 *   測試位置  http://qa-royalgameweb-cocos.rsg-games.com/QALogin
 *   Server   Slot-7778(Group2-QA)
 *   用戶來源  Cocos斷線續玩, Cocos無斷線續玩
 *   語系     全語系
 * 多選或「全…」時依優先規則挑一個：用戶來源優先「無斷線續玩」、語系優先「繁」、幣別優先「( NT )」，其餘取第一個。
 */

/** 登入頁表單欄位（radio 的 name） */
export type QaLoginField = 'host' | 'port' | 'platform' | 'website' | 'lang' | 'currency' | 'account';

export const QA_LOGIN_FIELD_LABELS: Record<QaLoginField, string> = {
  host: 'Server',
  port: 'Port',
  platform: '用戶來源',
  website: '登入方式',
  lang: '語系',
  currency: '幣別',
  account: '身分',
};

const KEY_TO_FIELD: Record<string, QaLoginField | 'url'> = {
  '測試位置': 'url',
  'server': 'host',
  'port': 'port',
  '用戶來源': 'platform',
  '登入方式': 'website',
  '語系': 'lang',
  '幣別': 'currency',
  '身分': 'account',
};

export interface QaLoginSpec {
  url?: string;
  /** 各欄的原始值（已拆成多選清單） */
  values: Partial<Record<QaLoginField, string[]>>;
}

/** 選項比對用：去掉所有空白（含全形空白）並轉小寫 */
export const normalizeOption = (s: string) => s.replace(/[\s\u3000]+/g, '').toLowerCase();

export function parseQaLoginSpec(text: string): QaLoginSpec {
  const spec: QaLoginSpec = { values: {} };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // 欄位與值以 Tab 分隔；沒有 Tab 時以第一段空白分隔
    const m = line.includes('\t') ? line.match(/^([^\t]+)\t+(.*)$/) : line.match(/^(\S+)\s+(.*)$/);
    if (!m) continue;
    const field = KEY_TO_FIELD[m[1].trim().toLowerCase()] ?? KEY_TO_FIELD[m[1].trim()];
    const value = m[2].replace(/\t/g, ' ').trim();
    if (!field || !value) continue;
    if (field === 'url') { spec.url = value.split(/\s+/)[0]; continue; }
    spec.values[field] = value.split(/[,，、]/).map(v => v.trim()).filter(Boolean);
  }
  return spec;
}

/** 多選或「全…」時的優先選項 */
const PREFERRED: Partial<Record<QaLoginField, (label: string) => boolean>> = {
  platform: l => normalizeOption(l).includes('無斷線續玩'),
  lang: l => normalizeOption(l) === '繁',
  currency: l => normalizeOption(l).includes('(nt)'),
};

const isAll = (values: string[]) => values.length === 1 && /^全/.test(values[0].trim());

/** 在頁面選項中找出與某個值對應的選項（完全相同優先，其次互相包含） */
export function matchOption(options: string[], wanted: string): number {
  const w = normalizeOption(wanted);
  if (!w) return -1;
  const norm = options.map(normalizeOption);
  const exact = norm.indexOf(w);
  if (exact >= 0) return exact;
  return norm.findIndex(o => o && (o.includes(w) || w.includes(o)));
}

/**
 * 依測試單的值，從頁面某欄的選項中挑一個。回傳選項索引，找不到為 -1。
 * - 「全…」：所有選項都是候選
 * - 多選：各值對應到的選項為候選
 * 候選中有優先選項就選它，否則取第一個候選。
 */
export function pickOption(field: QaLoginField, options: string[], values: string[]): number {
  const candidates = isAll(values)
    ? options.map((_, i) => i)
    : values.map(v => matchOption(options, v)).filter(i => i >= 0);
  if (candidates.length === 0) return -1;
  const prefer = PREFERRED[field];
  if (candidates.length > 1 && prefer) {
    const hit = candidates.find(i => prefer(options[i]));
    if (hit !== undefined) return hit;
  }
  return candidates[0];
}

/** 頁面上沒有時的身分清單（各 QALogin 頁相同） */
export const DEFAULT_ACCOUNTS = ['QA1', 'QA2', 'QA3', 'QA4', 'QA5', 'QA6', 'QA7', 'QA8', 'QA9', 'QA10', '路人甲', '路人乙', '路人丙'];

/** 從 QALogin 頁面讀出某欄所有 radio 與其文字（文字是 radio 後面到 <br> 之前的內容） */
export function readRadioOptions(doc: Document, field: QaLoginField): { input: HTMLInputElement; label: string }[] {
  return [...doc.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${field}"]`)].map(input => {
    let label = '';
    for (let n = input.nextSibling; n && n.nodeName !== 'BR' && !(n instanceof HTMLInputElement); n = n.nextSibling) {
      label += n.textContent ?? '';
    }
    return { input, label: label.trim() };
  });
}

export const QA_LOGIN_FIELDS: QaLoginField[] = ['host', 'port', 'platform', 'website', 'lang', 'currency', 'account'];

export interface QaLoginPlan {
  /** 各欄要選的選項索引 */
  choices: Partial<Record<QaLoginField, number>>;
  /** 已選好的欄位：欄位 → 選到的選項文字 */
  applied: Partial<Record<QaLoginField, string>>;
  /** 測試單有填、但頁面找不到對應選項的欄位 */
  missing: QaLoginField[];
}

/** 依頁面各欄的選項文字與測試單的值，決定每欄要選哪個 */
export function planQaLogin(options: Partial<Record<QaLoginField, string[]>>, values: Partial<Record<QaLoginField, string[]>>): QaLoginPlan {
  const plan: QaLoginPlan = { choices: {}, applied: {}, missing: [] };
  for (const field of QA_LOGIN_FIELDS) {
    const wanted = values[field];
    if (!wanted || wanted.length === 0) continue;
    const labels = options[field] ?? [];
    const idx = pickOption(field, labels, wanted);
    if (idx < 0) { plan.missing.push(field); continue; }
    plan.choices[field] = idx;
    plan.applied[field] = labels[idx];
  }
  return plan;
}

/**
 * 在登入頁內執行的腳本（桌面版 webview 用 executeJavaScript 執行）：讀出各欄 radio 的文字。
 * 不是 QA 登入頁時回傳 null。邏輯同 readRadioOptions。
 */
export const QA_LOGIN_READ_SCRIPT = `(() => {
  if (!document.querySelector('form') || !document.querySelector('input[type=radio][name="host"]')) return null;
  const fields = ${JSON.stringify(QA_LOGIN_FIELDS)};
  const out = {};
  for (const f of fields) {
    out[f] = [...document.querySelectorAll('input[type=radio][name="' + f + '"]')].map(input => {
      let label = '';
      for (let n = input.nextSibling; n && n.nodeName !== 'BR' && n.nodeName !== 'INPUT'; n = n.nextSibling) label += n.textContent || '';
      return label.trim();
    });
  }
  return out;
})()`;

/** 在登入頁內執行的腳本：依計畫勾選各欄、填密碼，必要時送出 */
export function buildQaLoginApplyScript(choices: QaLoginPlan['choices'], password: string, submit: boolean): string {
  return `(() => {
  const choices = ${JSON.stringify(choices)};
  for (const [f, i] of Object.entries(choices)) {
    const input = document.querySelectorAll('input[type=radio][name="' + f + '"]')[i];
    if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  const pw = document.querySelector('input[name="password"]');
  if (pw) pw.value = ${JSON.stringify(password)};
  if (${submit}) document.querySelector('form')?.requestSubmit();
  return true;
})()`;
}

/** 讀出頁面各欄選項（瀏覽器版 iframe 直接操作 DOM）；不是 QA 登入頁時回傳 null */
export function readQaLoginOptions(doc: Document): Partial<Record<QaLoginField, string[]>> | null {
  if (!doc.querySelector('form') || !doc.querySelector('input[type=radio][name="host"]')) return null;
  return Object.fromEntries(QA_LOGIN_FIELDS.map(f => [f, readRadioOptions(doc, f).map(o => o.label)]));
}

/** 依計畫勾選各欄並填密碼（瀏覽器版 iframe 直接操作 DOM） */
export function applyQaLoginPlan(doc: Document, choices: QaLoginPlan['choices'], password: string, submit: boolean) {
  for (const [f, i] of Object.entries(choices) as [QaLoginField, number][]) {
    const input = readRadioOptions(doc, f)[i]?.input;
    if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  const pw = doc.querySelector<HTMLInputElement>('input[name="password"]');
  if (pw) pw.value = password;
  if (submit) doc.querySelector('form')?.requestSubmit();
}
