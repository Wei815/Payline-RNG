import type { PaytableRule, GameType } from '../types';

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

export function evaluateGrid(
  grid: string[][],
  paytable: PaytableRule[],
  gameType: GameType = 'waygame',
  paylines: number[][] = defaultPaylines,
  includeZeroPayout = false
): WinResult[] {
  const results: WinResult[] = [];

  if (!grid || grid.length === 0 || !paytable || paytable.length === 0) {
    return results;
  }

  const wildSymbols = new Set(paytable.filter(p => p.isWild).map(p => p.symbolId));
  wildSymbols.add('WILD');
  wildSymbols.add('W');
  wildSymbols.add('WX');

  for (const rule of paytable) {
    const sym = rule.symbolId;

    // Scatter 計算
    if (rule.isScatter) {
      let scatterCount = 0;
      for (const col of grid) {
        for (const cell of col) {
          if (cell === sym || (sym === 'B1' && cell === 'B2')) scatterCount++;
        }
      }

      // 針對賽特2 (payanywhere_set2) 新增的邏輯：Scatter 至少需要 4 顆
      const minScatter = gameType === 'payanywhere_set2' ? 4 : 2;
      const autoWinCount = gameType === 'payanywhere_set2' ? 4 : 3;

      if (scatterCount >= minScatter) {
        const lookupMatch = Math.min(scatterCount, grid.length);
        const payout = rule.payouts[`match${lookupMatch}` as keyof typeof rule.payouts] || 0;
        if (payout > 0 || scatterCount >= autoWinCount || includeZeroPayout) {
          results.push({ symbolId: sym, matchCount: scatterCount, ways: 1, payout, totalWin: payout });
        }
      }
      continue;
    }

    // 針對賽特2 (payanywhere_set2) 新增的邏輯：與 payanywhere 共用相同判斷
    if (gameType === 'payanywhere' || gameType === 'payanywhere_set2') {
      // Pay Anywhere 模式：統計盤面總數，排除 Wild 符號
      let count = 0;
      for (const col of grid) {
        for (const cell of col) {
          if (cell === sym || (sym === 'B1' && cell === 'B2')) {
            count++;
          }
        }
      }

      // 映射規則：至少 8 顆才算中獎
      // match3 -> 8-9 個
      // match4 -> 10-11 個
      // match5 -> >=12 個
      if (count >= 8) {
        let lookupKey: 'match3' | 'match4' | 'match5' | null = null;
        if (count >= 8 && count <= 9) {
          lookupKey = 'match3';
        } else if (count >= 10 && count <= 11) {
          lookupKey = 'match4';
        } else if (count >= 12) {
          lookupKey = 'match5';
        }

        if (lookupKey) {
          const payout = rule.payouts[lookupKey] || 0;
          if (payout > 0 || includeZeroPayout) {
            results.push({
              symbolId: sym,
              matchCount: count,
              ways: 1,
              payout,
              totalWin: payout
            });
          }
        }
      }
    }
    else if (gameType === 'linegame') {
      // Line Game 模式：沿中獎線檢查連線
      paylines.forEach((line, lineIdx) => {
        let matchCount = 0;
        for (let colIdx = 0; colIdx < grid.length; colIdx++) {
          const targetRow = line[colIdx];
          if (targetRow === undefined || targetRow >= grid[colIdx].length) {
            break;
          }
          const cell = grid[colIdx][targetRow];
          if (cell === sym || (!rule.isWild && wildSymbols.has(cell))) {
            matchCount++;
          } else {
            break;
          }
        }

        if (matchCount >= 2) {
          const lookupMatch = Math.min(matchCount, grid.length);
          const payout = rule.payouts[`match${lookupMatch}` as keyof typeof rule.payouts] || 0;
          if (payout > 0 || includeZeroPayout) {
            results.push({
              symbolId: sym,
              matchCount: matchCount,
              ways: 1,
              payout,
              totalWin: payout,
              lineIndex: lineIdx
            });
          }
        }
      });
    }
    else {
      // waygame 或是 megaway 模式
      let currentWays = 1;
      let currentMatch = 0;

      for (let colIndex = 0; colIndex < grid.length; colIndex++) {
        const col = grid[colIndex];
        let countInCol = 0;
        for (const cell of col) {
          if (cell === sym || (!rule.isWild && wildSymbols.has(cell))) {
            countInCol++;
          }
        }

        if (countInCol > 0) {
          currentMatch++;
          currentWays *= countInCol;
        } else {
          break;
        }
      }

      if (currentMatch >= 2) {
        const lookupMatch = Math.min(currentMatch, grid.length);
        const payout = rule.payouts[`match${lookupMatch}` as keyof typeof rule.payouts] || 0;
        if (payout > 0 || currentMatch >= 3 || includeZeroPayout) {
          results.push({
            symbolId: sym,
            matchCount: currentMatch,
            ways: currentWays,
            payout,
            totalWin: payout * currentWays
          });
        }
      }
    }
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
