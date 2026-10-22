/** 常用特殊符號 ID */
export const SpecialSymbols = {
  S1: 'S1',
  S2: 'S2',
  B1: 'B1',
  B2: 'B2',
  WX: 'WX',
  WW: 'WW',
  WILD: 'WILD',
  W: 'W',
  TE: 'TE',
  NI: 'NI',
} as const;

export const DEFAULT_WILD_SYMBOLS = ['WILD', 'W', 'WX', 'WY', 'WZ'];

/**
 * 衍生符號：計算 key 的個數 / 連線時，value 內的符號也算（B2 算作 B1）
 * 評估時未指定 specialRules.derivativeSymbols 就使用此預設，所有工具（搜尋、驗證、畫面、RTP）才會一致
 */
export const DEFAULT_DERIVATIVE_SYMBOLS: Record<string, string[]> = { B1: ['B2'] };

export function derivativesOf(specialRules: { derivativeSymbols?: Record<string, string[]> } | undefined, sym: string): string[] | undefined {
  return (specialRules?.derivativeSymbols ?? DEFAULT_DERIVATIVE_SYMBOLS)[sym];
}

export const DEFAULT_PAY_ANYWHERE_THRESHOLDS = {
  match3: 8,
  match4: 10,
  match5: 12
};

export const MULTIPLIER_BALLS = [
  { id: 'F1', name: 'F1 (綠色)', color: 'text-green-400', border: 'border-green-500/50', values: [2, 3, 4, 6, 8] },
  { id: 'F2', name: 'F2 (藍色)', color: 'text-blue-400', border: 'border-blue-500/50', values: [10, 12, 15, 18, 25] },
  { id: 'F3', name: 'F3 (紫色)', color: 'text-purple-400', border: 'border-purple-500/50', values: [55, 65, 80] },
  { id: 'F4', name: 'F4 (紅色)', color: 'text-red-400', border: 'border-red-500/50', values: [100, 150, 200, 250, 500] }
];

export const LUCKY_BALLS = [
  { id: 'L1', name: 'L1 (綠色)', color: 'text-green-400', border: 'border-green-500/50', values: [2, 3, 4, 6, 8] },
  { id: 'L2', name: 'L2 (藍色)', color: 'text-blue-400', border: 'border-blue-500/50', values: [10, 12, 15, 18, 25] },
  { id: 'L3', name: 'L3 (紫色)', color: 'text-purple-400', border: 'border-purple-500/50', values: [55, 65, 80] },
  { id: 'L4', name: 'L4 (紅色)', color: 'text-red-400', border: 'border-red-500/50', values: [100, 150, 200, 250, 500] }
];

export function getBaseSymbol(symbol: string): string {
  if (!symbol || symbol.length < 2 || !symbol.startsWith('G')) return symbol;
  
  if (symbol === 'GA') return 'A';
  if (symbol === 'GK') return 'K';
  if (symbol === 'GQ') return 'Q';
  if (symbol === 'GJ') return 'J';
  if (symbol === 'G10') return '10';
  if (symbol === 'G9') return '9';
  
  return symbol.replace('G', 'M'); // G1 -> M1
}

export function isGoldSymbol(symbol: string): boolean {
  if (!symbol) return false;
  return symbol.startsWith('G') && symbol !== 'G';
}
