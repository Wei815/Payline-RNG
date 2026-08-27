import { BaseLineGame } from '../base/BaseLineGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';

export class LuxeGame extends BaseLineGame {
  readonly id: GameType = 'linegame_set2';
  readonly name = '奢華 (Luxe)';

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
    // 1. Get base linegame evaluation results
    const baseWins = super.evaluate(grid, paytable, config, customPaylines, includeZeroPayout);
    const finalWins = [...baseWins];

    const actualPaylines = config.paylines && config.paylines.length > 0 ? config.paylines : (customPaylines || []);

    // 2. Evaluate Jackpots on winning lines
    if (config.jackpots && Object.keys(config.jackpots).length > 0) {
      const hitJackpotKeys = new Set<string>();
      
      for (const win of baseWins) {
        if (win.totalWin > 0 && win.lineIndex !== undefined && actualPaylines[win.lineIndex]) {
           const line = actualPaylines[win.lineIndex];
           for (let c = 0; c < win.matchCount; c++) {
              const r = line[c];
              const posKey = `${c}-${r}`;
              if (config.jackpots[posKey]) {
                 hitJackpotKeys.add(posKey);
              }
           }
        }
      }
      
      for (const posKey of hitJackpotKeys) {
        const jp = config.jackpots[posKey];
        let jpWin = 0;
        if (jp === 'MINI') jpWin = 25;
        else if (jp === 'MAJOR') jpWin = 100;
        else if (jp === 'MEGA') jpWin = 500;
        else if (jp === 'MAXWIN') jpWin = 20000;
        
        if (jpWin > 0) {
           const bet = config.effectiveBet || 1;
           finalWins.push({
              symbolId: jp + ' 大獎',
              matchCount: 0,
              ways: 1,
              payout: jpWin,
              totalWin: jpWin * bet,
              isJackpot: true
           });
        }
      }
    }

    // 3. S1 Clover Collection
    let s1Count = 0;
    let s1Multiplier = 0;
    
    for (let c = 0; c < grid.length; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        const cell = grid[c][r];
        if (cell === 'S1') s1Count++;
        
        const posKey = `${c}-${r}`;
        // Collect gold frames
        if (config.goldFrames && config.goldFrames[posKey]) {
           s1Multiplier += config.goldFrames[posKey];
        }
        // Collect Jackpots (any on the board)
        if (config.jackpots && config.jackpots[posKey]) {
           const jp = config.jackpots[posKey];
           if (jp === 'MINI') s1Multiplier += 25;
           else if (jp === 'MAJOR') s1Multiplier += 100;
           else if (jp === 'MEGA') s1Multiplier += 500;
           else if (jp === 'MAXWIN') s1Multiplier += 20000;
        }
        // Collect multiplier symbols
        if (cell.includes('_') && cell.match(/^[F|L][1-4]_/)) {
           const valStr = cell.split('_')[1];
           const num = parseInt(valStr.replace('X', ''), 10);
           if (!isNaN(num)) s1Multiplier += num;
        }
      }
    }

    if (s1Count > 0 && s1Multiplier > 0) {
      const bet = config.effectiveBet || 1;
      finalWins.push({
         symbolId: 'S1 收集',
         matchCount: s1Count,
         ways: s1Count,
         payout: s1Multiplier,
         totalWin: s1Multiplier * bet * s1Count,
         isJackpot: true
      });
    }

    return finalWins;
  }
}
