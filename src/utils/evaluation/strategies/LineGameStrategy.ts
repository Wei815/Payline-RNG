import type { PaytableRule } from '../../../types';
import type { WinResult } from '../../evaluation';
import type { EvaluationContext, EvaluationStrategy } from './EvaluationStrategy';

export class LineGameStrategy implements EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[] {
    const { grid, gameConfig, wildSymbols, includeZeroPayout } = context;
    const sym = rule.symbolId;
    const paylines = gameConfig.paylines || [];
    const results: WinResult[] = [];
    const derivatives = gameConfig.specialRules?.derivativeSymbols?.[sym];

    paylines.forEach((line, lineIdx) => {
      let matchCount = 0;
      for (let colIdx = 0; colIdx < grid.length; colIdx++) {
        const targetRow = line[colIdx];
        if (targetRow === undefined || targetRow >= grid[colIdx].length) {
          break;
        }
        
        const cell = grid[colIdx][targetRow];
        let isMatch = cell === sym || (!rule.isWild && wildSymbols.has(cell));
        
        if (!isMatch && derivatives) {
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

          let goldFrameMultipliers = 0;
          let jackpotBonus = 0;

          // Check gold frames and jackpots along the matched symbols
          for (let c = 0; c < matchCount; c++) {
            const r = line[c];
            const posKey = `${c}-${r}`;
            if (gameConfig.goldFrames && gameConfig.goldFrames[posKey]) {
              goldFrameMultipliers += gameConfig.goldFrames[posKey];
            }
            if (gameConfig.jackpots && gameConfig.jackpots[posKey]) {
              const jp = gameConfig.jackpots[posKey];
              const bet = gameConfig.effectiveBet || 1;
              if (jp === 'MINI') jackpotBonus += bet * 25;
              else if (jp === 'MAJOR') jackpotBonus += bet * 100;
              else if (jp === 'MEGA') jackpotBonus += bet * 500;
              else if (jp === 'MAXWIN') jackpotBonus += bet * 20000;
            }
          }

          if (goldFrameMultipliers > 0) {
            totalWin = totalWin * goldFrameMultipliers;
          }
          
          totalWin += jackpotBonus;

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
