import { BasePayAnywhere } from '../base/BasePayAnywhere';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class BattleSet2Game extends BasePayAnywhere {
  readonly id: GameType = 'payanywhere_set2';
  readonly name = '決戰賽特2 (Battle Set 2)';

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
    return [[], [], [], [], [], []];
  }

  // Override cascade to implement array shifting rule
  protected override applyCascade(
    grid: string[][],
    colIndex: number,
    eliminatedRows: number[],
    strip: string[],
    drawIndices: number[],
    isFreeGame: boolean,
    gameType: GameType
  ): void {
    eliminatedRows.sort((a, b) => b - a);
    for (const r of eliminatedRows) {
      // Shift symbols above the eliminated row down by 1
      for (let shift = r; shift > 0; shift--) {
        grid[colIndex][shift] = grid[colIndex][shift - 1];
      }
      
      // Draw new symbol at the top
      const len = strip.length;
      const drawIdx = (((drawIndices[colIndex] % len) + len) % len);
      grid[colIndex][0] = strip[drawIdx];
      drawIndices[colIndex]--;
    }
  }
}
