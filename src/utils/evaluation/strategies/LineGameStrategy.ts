import type { PaytableRule } from '../../../types';
import type { WinResult } from '../../evaluation';
import type { EvaluationContext, EvaluationStrategy } from './EvaluationStrategy';

export class LineGameStrategy implements EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[] {
    const { grid, gameConfig, wildSymbols, includeZeroPayout } = context;
    const sym = rule.symbolId;
    const paylines = gameConfig.paylines || [];
    const results: WinResult[] = [];

    paylines.forEach((line, lineIdx) => {
      let matchCount = 0;
      for (let colIdx = 0; colIdx < grid.length; colIdx++) {
        const targetRow = line[colIdx];
        if (targetRow === undefined || targetRow >= grid[colIdx].length) {
          break;
        }
        
        const cell = grid[colIdx][targetRow];
        let isMatch = cell === sym || (!rule.isWild && wildSymbols.has(cell));
        
        if (!isMatch && gameConfig.specialRules?.derivativeSymbols?.[sym]) {
           const derivatives = gameConfig.specialRules.derivativeSymbols[sym];
           if (derivatives.includes(cell)) {
             isMatch = true;
           }
        }

        if (isMatch) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 2) {
        const lookupMatch = Math.min(matchCount, grid.length);
        const payout = rule.payouts[`match${lookupMatch}` as keyof typeof rule.payouts] || 0;
        if (payout > 0 || includeZeroPayout) {
          let totalWin = payout;
          if (sym === 'B1' || sym === 'B2') {
            totalWin = payout * (gameConfig.effectiveBet || 1);
          }
          results.push({
            symbolId: sym,
            matchCount: matchCount,
            ways: 1,
            payout,
            totalWin,
            lineIndex: lineIdx
          });
        }
      }
    });

    return results;
  }
}
