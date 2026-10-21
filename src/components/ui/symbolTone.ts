/**
 * 盤面符號分類配色：所有盤面（手動、產生器、自定義、消除掉落、驗證工具）共用，
 * 讓 QA 一眼分辨高分 / 低分 / 百搭 / Scatter / Bonus / 金框。顏色來自主題 Token（sym-*），日夜主題自動切換。
 */
export type SymbolKind = 'empty' | 'wild' | 'scatter' | 'bonus' | 'gold' | 'high' | 'low' | 'unknown';

const WILDS = new Set(['WX', 'WY', 'WZ', 'W', 'WILD', 'WW']);
const SCATTERS = new Set(['S1', 'S2', 'SCATTER']);
const BONUSES = new Set(['B1', 'B2', 'BONUS']);

export function symbolKind(sym: string): SymbolKind {
  if (!sym || sym === '-' || sym === '0') return 'empty';
  if (sym.startsWith('?')) return 'unknown';
  const base = sym.split('_')[0].toUpperCase();
  if (WILDS.has(base)) return 'wild';
  if (SCATTERS.has(base)) return 'scatter';
  if (BONUSES.has(base)) return 'bonus';
  if (/^G[1-9A-Z]/.test(base)) return 'gold';
  if (/^(M|H)\d/.test(base)) return 'high';
  return 'low';
}

const TONE: Record<SymbolKind, string> = {
  empty: 'bg-dashboard-inset text-dashboard-text-muted border border-dashed border-dashboard-border-strong',
  wild: 'bg-sym-wild/15 text-sym-wild border border-sym-wild/55',
  scatter: 'bg-sym-scatter/15 text-sym-scatter border border-sym-scatter/50',
  bonus: 'bg-sym-bonus/15 text-sym-bonus border border-sym-bonus/50',
  gold: 'bg-sym-wild/10 text-sym-wild border-2 border-sym-wild/75',
  high: 'bg-sym-high/12 text-sym-high border border-sym-high/40',
  low: 'bg-dashboard-raised text-sym-low border border-dashboard-border-strong',
  unknown: 'bg-danger/12 text-danger border border-danger/50',
};

/** 格子的底色 / 字色 / 邊框 class */
export function symbolToneClass(sym: string): string {
  return TONE[symbolKind(sym)];
}

/** 圖例（顯示在盤面下方） */
export const SYMBOL_LEGEND: { kind: SymbolKind; label: string }[] = [
  { kind: 'high', label: '高分' },
  { kind: 'low', label: '低分' },
  { kind: 'wild', label: '百搭' },
  { kind: 'scatter', label: 'Scatter' },
  { kind: 'bonus', label: 'Bonus' },
  { kind: 'gold', label: '金框' },
];
