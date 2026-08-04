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
  multiplier?: number; // 記錄倍數（如金框加成的倍數）
  isJackpot?: boolean; // 標記是否為大獎，以區分計算邏輯
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
    } else if (gameType === 'linegame' || gameType === 'linegame_set2') {
      strategy = STRATEGY_INSTANCES.linegame;
    } else {
      // fallback to waygame/megaway
      strategy = STRATEGY_INSTANCES.waygame;
    }

    const wins = strategy.evaluate(context, rule);
    results.push(...wins);
  }

  if (gameType === 'linegame' || gameType === 'linegame_set2') {
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
    
    const finalLineWins = Array.from(lineWins.values());
    const finalWins = [...nonLineWins, ...finalLineWins];

    if (gameConfig.jackpots && Object.keys(gameConfig.jackpots).length > 0) {
      const hitJackpotKeys = new Set<string>();
      
      const actualPaylines = gameConfig.paylines && gameConfig.paylines.length > 0 ? gameConfig.paylines : paylines;
      
      for (const win of finalLineWins) {
        if (win.totalWin > 0 && win.lineIndex !== undefined && actualPaylines[win.lineIndex]) {
           const line = actualPaylines[win.lineIndex];
           for (let c = 0; c < win.matchCount; c++) {
              const r = line[c];
              const posKey = `${c}-${r}`;
              if (gameConfig.jackpots[posKey]) {
                 hitJackpotKeys.add(posKey);
              }
           }
        }
      }
      
      for (const posKey of hitJackpotKeys) {
        const jp = gameConfig.jackpots[posKey];
        let jpWin = 0;
        if (jp === 'MINI') jpWin = 25;
        else if (jp === 'MAJOR') jpWin = 100;
        else if (jp === 'MEGA') jpWin = 500;
        else if (jp === 'MAXWIN') jpWin = 20000;
        
        if (jpWin > 0) {
           const bet = gameConfig.effectiveBet || 1;
           finalWins.push({
              symbolId: jp + ' 大獎', // Append text so UI identifies it clearly
              matchCount: 0,
              ways: 1,
              payout: jpWin, // raw multiplier
              totalWin: jpWin * bet, // Jackpot is multiplier * total bet
              isJackpot: true
           });
        }
      }
    }

    // --- S1 幸運草收集 ---
    let s1Count = 0;
    let s1Multiplier = 0;
    
    for (let c = 0; c < grid.length; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        const cell = grid[c][r];
        if (cell === 'S1') s1Count++;
        
        const posKey = `${c}-${r}`;
        // 收集金框
        if (gameConfig.goldFrames && gameConfig.goldFrames[posKey]) {
           s1Multiplier += gameConfig.goldFrames[posKey];
        }
        // 收集大獎
        if (gameConfig.jackpots && gameConfig.jackpots[posKey]) {
           const jp = gameConfig.jackpots[posKey];
           if (jp === 'MINI') s1Multiplier += 25;
           else if (jp === 'MAJOR') s1Multiplier += 100;
           else if (jp === 'MEGA') s1Multiplier += 500;
           else if (jp === 'MAXWIN') s1Multiplier += 20000;
        }
        // 收集一般帶倍數的符號 (F1_2X, 等)
        if (cell.includes('_') && cell.match(/^[F|L][1-4]_/)) {
           const valStr = cell.split('_')[1];
           const num = parseInt(valStr.replace('X', ''), 10);
           if (!isNaN(num)) s1Multiplier += num;
        }
      }
    }

    if (s1Count > 0 && s1Multiplier > 0) {
      const bet = gameConfig.effectiveBet || 1;
      finalWins.push({
         symbolId: 'S1 收集',
         matchCount: s1Count,
         ways: s1Count, // 代表有幾個 S1 參與收集
         payout: s1Multiplier,
         totalWin: s1Multiplier * bet * s1Count,
         isJackpot: true // 借用大獎的計算邏輯 (乘上總押注)
      });
    }

    return finalWins;
  }

  return results;
}
export * from './evaluation/WinningPositions';
