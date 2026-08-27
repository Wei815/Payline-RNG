import type { GameConfig, PaytableRule, ReelStrips } from '../../types';
import type { WinResult } from '../../utils/evaluation';
import { PayAnywhereStrategy } from '../../utils/evaluation/strategies/PayAnywhereStrategy';
import { AbstractGame } from './AbstractGame';
import { DEFAULT_WILD_SYMBOLS } from '../../utils/evaluation/GameConstants';
import { ScatterStrategy } from '../../utils/evaluation/strategies/ScatterStrategy';

export abstract class BasePayAnywhere extends AbstractGame {
  private scatterStrategy = new ScatterStrategy();
  private payAnywhereStrategy = new PayAnywhereStrategy();

  public override isPositionDependent(): boolean {
    return false;
  }

  evaluate(
    grid: string[][],
    paytable: PaytableRule[],
    config: GameConfig,
    _customPaylines?: number[][],
    includeZeroPayout: boolean = false
  ): WinResult[] {
    const results: WinResult[] = [];
    if (!grid || grid.length === 0 || !paytable || paytable.length === 0) return results;

    const wildSymbols = new Set(paytable.filter(p => p.isWild).map(p => p.symbolId));
    const configuredWilds = config.wildSymbols || DEFAULT_WILD_SYMBOLS;
    configuredWilds.forEach(w => wildSymbols.add(w));

    const context = {
      grid,
      paytable,
      gameConfig: config,
      wildSymbols,
      includeZeroPayout
    };

    for (const rule of paytable) {
      if (rule.isScatter) {
        results.push(...this.scatterStrategy.evaluate(context, rule));
      } else {
        results.push(...this.payAnywhereStrategy.evaluate(context, rule));
      }
    }
    
    return results;
  }
}
