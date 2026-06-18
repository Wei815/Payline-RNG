import type { PaytableRule, GameType, GameConfig } from '../types';
import { DEFAULT_WILD_SYMBOLS } from './evaluation/GameConstants';
import { ScatterStrategy } from './evaluation/strategies/ScatterStrategy';
import { PayAnywhereStrategy } from './evaluation/strategies/PayAnywhereStrategy';
import { LineGameStrategy } from './evaluation/strategies/LineGameStrategy';
import { WayGameStrategy } from './evaluation/strategies/WayGameStrategy';
import type { EvaluationContext, EvaluationStrategy } from './evaluation/strategies/EvaluationStrategy';

export interface WinResult {
  symbolId: string;
  matchCount: number;
  ways: number;
  payout: number;
  totalWin: number;
  lineIndex?: number; // 記錄 linegame 中獎的贏分線索引
}

// 內建的 20 條中獎線，對應 3x5 盤面
export const defaultPaylines = [
  [1, 1, 1, 1, 1], // 中間水平
  [0, 0, 0, 0, 0], // 上方水平
  [2, 2, 2, 2, 2], // 下方水平
  [0, 1, 2, 1, 0], // V 字
  [2, 1, 0, 1, 2], // 倒 V 字
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 0, 2, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1]
];

const STRATEGY_INSTANCES = {
  scatter: new ScatterStrategy(),
  payanywhere: new PayAnywhereStrategy(),
  linegame: new LineGameStrategy(),
  waygame: new WayGameStrategy()
};

export function evaluateGrid(
  grid: string[][],
  paytable: PaytableRule[],
  gameConfigOrType: GameType | GameConfig = 'waygame',
  paylines: number[][] = defaultPaylines,
  includeZeroPayout = false
): WinResult[] {
  const results: WinResult[] = [];

  if (!grid || grid.length === 0 || !paytable || paytable.length === 0) {
    return results;
  }

  // Backwards compatibility layer for legacy calls
  const gameConfig: GameConfig = typeof gameConfigOrType === 'string' 
    ? { gameType: gameConfigOrType, paylines }
    : gameConfigOrType;

  const gameType = gameConfig.gameType;

  const wildSymbols = new Set(paytable.filter(p => p.isWild).map(p => p.symbolId));
  const configuredWilds = gameConfig.wildSymbols || DEFAULT_WILD_SYMBOLS;
  configuredWilds.forEach(w => wildSymbols.add(w));

  const context: EvaluationContext = {
    grid,
    paytable,
    gameConfig,
    wildSymbols,
    includeZeroPayout
  };

  for (const rule of paytable) {
    let strategy: EvaluationStrategy;

    if (rule.isScatter) {
      strategy = STRATEGY_INSTANCES.scatter;
    } else if (gameType === 'payanywhere' || gameType === 'payanywhere_set2') {
      strategy = STRATEGY_INSTANCES.payanywhere;
    } else if (gameType === 'linegame') {
      strategy = STRATEGY_INSTANCES.linegame;
    } else {
      // fallback to waygame/megaway
      strategy = STRATEGY_INSTANCES.waygame;
    }

    const wins = strategy.evaluate(context, rule);
    results.push(...wins);
  }

  if (gameType === 'linegame') {
    const lineWins = new Map<number, WinResult>();
    const nonLineWins: WinResult[] = [];

    for (const win of results) {
      if (win.lineIndex !== undefined) {
        const existing = lineWins.get(win.lineIndex);
        if (!existing || win.totalWin > existing.totalWin) {
          lineWins.set(win.lineIndex, win);
        }
      } else {
        nonLineWins.push(win);
      }
    }
    return [...nonLineWins, ...Array.from(lineWins.values())];
  }

  return results;
}
