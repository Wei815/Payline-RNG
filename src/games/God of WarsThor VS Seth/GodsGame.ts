import { BaseLineGame } from '../base/BaseLineGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';

export class GodsGame extends BaseLineGame {
  readonly id: GameType = 'linegame_gods';
  readonly name = '諸神之戰：雷神VS戰神';

  getDefaultConfig(): GameConfig {
    return {
      gameType: this.id,
      paylines: []
    };
  }

  getDefaultPaytable(): PaytableRule[] {
    return [];
  }

  getDefaultReelStrips(): ReelStrips {
    return [[], [], [], [], []];
  }

  override evaluate(
    grid: string[][],
    paytable: PaytableRule[],
    config: GameConfig,
    customPaylines?: number[][],
    includeZeroPayout: boolean = false
  ): WinResult[] {
    // 1. Check for WY in config and expand them
    const clonedGrid = grid.map(col => [...col]);
    const wyCols: number[] = [];
    
    for (let c = 0; c < clonedGrid.length; c++) {
      if (clonedGrid[c].includes('WY')) {
        wyCols.push(c);
        // Expand WY to cover the whole reel as WX
        clonedGrid[c] = clonedGrid[c].map(() => 'WX');
      }
    }

    // 2. Get base linegame evaluation results using the expanded grid
    const baseWins = super.evaluate(clonedGrid, paytable, config, customPaylines, includeZeroPayout);
    
    // 3. Apply Multipliers from WY Configs
    if (wyCols.length > 0 && config.wyConfigs) {
      for (const win of baseWins) {
        if (win.lineIndex !== undefined && !win.isJackpot) {
          // In a standard left-to-right line game, a win of length `matchCount`
          // covers reels 0 to matchCount - 1.
          let combinedMultiplier = 0;
          for (const wyCol of wyCols) {
            if (wyCol < win.matchCount) {
              const wyCfg = config.wyConfigs[wyCol];
              if (wyCfg) {
                const mult = wyCfg.z === 0 ? wyCfg.a : wyCfg.b;
                combinedMultiplier += mult; // Multipliers are added together
              }
            }
          }

          if (combinedMultiplier > 0) {
            win.multiplier = combinedMultiplier;
            win.totalWin = win.totalWin * combinedMultiplier;
          }
        }
      }
    }

    return baseWins;
  }
}
