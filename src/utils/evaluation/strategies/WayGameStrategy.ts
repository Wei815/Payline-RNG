import { getBaseSymbol, derivativesOf } from '../GameConstants';
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
        let isMatch = getBaseSymbol(cell) === getBaseSymbol(sym) || (!rule.isWild && wildSymbols.has(getBaseSymbol(cell)));
        
        const derivatives = derivativesOf(gameConfig.specialRules, sym);
        if (!isMatch && derivatives) {
           if (derivatives.includes(getBaseSymbol(cell))) {
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
      // 0 賠率只在要求時回傳（例如秦皇 / 皇家金象 WX 自成 3 連為 0 分，不可當成中獎被消除或計入命中）
      if (payout > 0 || includeZeroPayout) {
        let totalWin = payout * currentWays;
        const betScaled = sym === 'B1' || sym === 'B2';
        if (betScaled) {
          totalWin = payout * currentWays * (gameConfig.effectiveBet || 1);
        }
        return [{
          symbolId: sym,
          matchCount: currentMatch,
          ways: currentWays,
          payout,
          totalWin,
          ...(betScaled ? { betScaled: true } : {})
        }];
      }
    }

    return [];
  }
}
