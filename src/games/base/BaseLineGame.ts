import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';
import { LineGameStrategy } from '../../utils/evaluation/strategies/LineGameStrategy';
import { AbstractGame } from './AbstractGame';
import { DEFAULT_WILD_SYMBOLS } from '../../utils/evaluation/GameConstants';
import { ScatterStrategy } from '../../utils/evaluation/strategies/ScatterStrategy';

export abstract class BaseLineGame extends AbstractGame {
  private scatterStrategy = new ScatterStrategy();
  private lineGameStrategy = new LineGameStrategy();

  evaluate(
    grid: string[][],
    paytable: PaytableRule[],
    config: GameConfig,
    customPaylines?: number[][],
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
        results.push(...this.lineGameStrategy.evaluate(context, rule));
      }
    }

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

  // Line games do not cascade
  override async findRngForCombos(
    _currentStrips: string[][],
    _rowCounts: number[],
    _currentPaytable: PaytableRule[],
    _reelCount: number,
    _gameType: GameType,
    _topTrackerOther?: string[],
    _customPaylines?: number[][],
    _isFreeGame?: boolean,
    _stripSets?: Record<string, string[][]>
  ): Promise<(number[] | null)[]> {
    return [];
  }
}
