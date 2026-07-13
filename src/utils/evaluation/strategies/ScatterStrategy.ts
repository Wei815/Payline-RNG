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

    // Determine minimum scatter count from payouts dynamically
    let dynamicMinScatter = Infinity;
    let dynamicAutoWinCount = Infinity;
    for (let i = 2; i <= 20; i++) {
      const p = rule.payouts[`match${i}` as keyof typeof rule.payouts];
      if (p !== undefined && p > 0) {
        if (i < dynamicMinScatter) dynamicMinScatter = i;
        if (i > dynamicAutoWinCount || dynamicAutoWinCount === Infinity) dynamicAutoWinCount = i;
      }
    }

    const minScatter = dynamicMinScatter !== Infinity ? dynamicMinScatter : (gameConfig.specialRules?.scatterMinCount ?? 2);
    const autoWinCount = dynamicAutoWinCount !== Infinity ? dynamicAutoWinCount : (gameConfig.specialRules?.scatterAutoWinCount ?? 3);

    if (scatterCount >= minScatter) {
      let payout = 0;
      for (let i = scatterCount; i >= 1; i--) {
        const p = rule.payouts[`match${i}` as keyof typeof rule.payouts];
        if (p !== undefined && p > 0) {
          payout = p;
          break;
        }
      }

      if (payout > 0 || scatterCount >= autoWinCount || includeZeroPayout) {
        let totalWin = payout;
        if (sym === 'S1' || sym === 'S2' || sym === 'B1' || sym === 'B2') {
          totalWin = payout * (gameConfig.effectiveBet || 1);
        }
        return [{ symbolId: sym, matchCount: scatterCount, ways: 1, payout, totalWin }];
      }
    }

    return [];
  }
}
