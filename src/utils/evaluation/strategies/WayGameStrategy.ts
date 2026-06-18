import type { PaytableRule } from '../../../types';
import type { WinResult } from '../../evaluation';
import type { EvaluationContext, EvaluationStrategy } from './EvaluationStrategy';

export class WayGameStrategy implements EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[] {
    const { grid, gameConfig, wildSymbols, includeZeroPayout } = context;
    const sym = rule.symbolId;
    let currentWays = 1;
    let currentMatch = 0;

    for (let colIndex = 0; colIndex < grid.length; colIndex++) {
      const col = grid[colIndex];
      let countInCol = 0;
      for (const cell of col) {
        let isMatch = cell === sym || (!rule.isWild && wildSymbols.has(cell));
        
        if (!isMatch && gameConfig.specialRules?.derivativeSymbols?.[sym]) {
           const derivatives = gameConfig.specialRules.derivativeSymbols[sym];
           if (derivatives.includes(cell)) {
             isMatch = true;
           }
        }

        if (isMatch) {
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
        let totalWin = payout * currentWays;
        if (sym === 'B1' || sym === 'B2') {
          totalWin = payout * currentWays * (gameConfig.effectiveBet || 1);
        }
        return [{
          symbolId: sym,
          matchCount: currentMatch,
          ways: currentWays,
          payout,
          totalWin
        }];
      }
    }

    return [];
  }
}
