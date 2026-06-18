import type { PaytableRule } from '../../../types';
import type { WinResult } from '../../evaluation';
import type { EvaluationContext, EvaluationStrategy } from './EvaluationStrategy';
import { DEFAULT_PAY_ANYWHERE_THRESHOLDS } from '../GameConstants';

export class PayAnywhereStrategy implements EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[] {
    const { grid, gameConfig, includeZeroPayout } = context;
    const sym = rule.symbolId;
    let count = 0;

    for (const col of grid) {
      for (const cell of col) {
        let isMatch = cell === sym;
        if (!isMatch && gameConfig.specialRules?.derivativeSymbols?.[sym]) {
           const derivatives = gameConfig.specialRules.derivativeSymbols[sym];
           if (derivatives.includes(cell)) {
             isMatch = true;
           }
        }

        if (isMatch) count++;
      }
    }

    const thresholds = gameConfig.specialRules?.payAnywhereThresholds ?? DEFAULT_PAY_ANYWHERE_THRESHOLDS;

    if (count >= thresholds.match3) {
      let lookupKey: 'match3' | 'match4' | 'match5' | null = null;
      if (count >= thresholds.match3 && count < thresholds.match4) {
        lookupKey = 'match3';
      } else if (count >= thresholds.match4 && count < thresholds.match5) {
        lookupKey = 'match4';
      } else if (count >= thresholds.match5) {
        lookupKey = 'match5';
      }

      if (lookupKey) {
        const payout = rule.payouts[lookupKey] || 0;
        if (payout > 0 || includeZeroPayout) {
          return [{
            symbolId: sym,
            matchCount: count,
            ways: 1,
            payout,
            totalWin: payout
          }];
        }
      }
    }

    return [];
  }
}
