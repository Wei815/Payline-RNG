import type { PaytableRule } from '../../../types';
import type { WinResult } from '../../evaluation';
import type { EvaluationContext, EvaluationStrategy } from './EvaluationStrategy';

export class ScatterStrategy implements EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[] {
    const { grid, gameConfig, includeZeroPayout } = context;
    const sym = rule.symbolId;
    let scatterCount = 0;

    for (const col of grid) {
      for (const cell of col) {
        let isMatch = cell === sym;
        
        if (!isMatch && gameConfig.specialRules?.derivativeSymbols?.[sym]) {
           const derivatives = gameConfig.specialRules.derivativeSymbols[sym];
           if (derivatives.includes(cell)) {
             isMatch = true;
           }
        }
        
        if (isMatch) scatterCount++;
      }
    }

    const minScatter = gameConfig.specialRules?.scatterMinCount ?? 2;
    const autoWinCount = gameConfig.specialRules?.scatterAutoWinCount ?? 3;

    if (scatterCount >= minScatter) {
      const lookupMatch = Math.min(scatterCount, grid.length);
      const payout = rule.payouts[`match${lookupMatch}` as keyof typeof rule.payouts] || 0;
      if (payout > 0 || scatterCount >= autoWinCount || includeZeroPayout) {
        let totalWin = payout;
        if (sym === 'B1' || sym === 'B2') {
          totalWin = payout * (gameConfig.effectiveBet || 1);
        }
        return [{ symbolId: sym, matchCount: scatterCount, ways: 1, payout, totalWin }];
      }
    }

    return [];
  }
}
