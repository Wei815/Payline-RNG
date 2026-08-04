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
        if (targetRow === undefined || targetRow < 0 || targetRow >= grid[colIdx].length) {
          break;
        }
        
        const cell = grid[colIdx][targetRow];
        const baseCell = cell.split('_')[0];
        let isMatch = cell === sym || baseCell === sym || (!rule.isWild && wildSymbols.has(baseCell));
        
        if (!isMatch && derivatives) {
           if (derivatives.includes(baseCell)) {
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

          // Check gold frames along the matched symbols
          for (let c = 0; c < matchCount; c++) {
            const r = line[c];
            const posKey = `${c}-${r}`;
            const cell = grid[c][r];
            if (gameConfig.goldFrames && gameConfig.goldFrames[posKey]) {
              goldFrameMultipliers += gameConfig.goldFrames[posKey];
            }
            if (cell.includes('_') && cell.match(/^[F|L][1-4]_/)) {
              const valStr = cell.split('_')[1];
              const num = parseInt(valStr.replace('X', ''), 10);
              if (!isNaN(num)) goldFrameMultipliers += num;
            }
          }

          // 贏分線如果經過金框，贏分乘上倍數 (多個則倍數相加)
          if (goldFrameMultipliers > 0) {
            totalWin = totalWin * goldFrameMultipliers;
          }

          results.push({
            symbolId: sym,
            matchCount: matchCount,
            ways: 1,
            payout,
            totalWin,
            lineIndex: lineIdx,
            multiplier: goldFrameMultipliers > 0 ? goldFrameMultipliers : undefined
          });
        }
      }
    });

    return results;
  }
}
