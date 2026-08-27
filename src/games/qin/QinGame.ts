import { BaseWayGame } from '../base/BaseWayGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class QinGame extends BaseWayGame {
  readonly id: GameType = 'waygame_qin';
  readonly name = '秦皇傳說 (Qin)';

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
    return {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: []
    };
  }

  // Override cascade to implement Gold -> WX rule
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
      if (isFreeGame && grid[colIndex][r] === 'S1') {
        continue;
      }
      
      if (this.isGoldSymbol(grid[colIndex][r])) {
        // Gold symbol turns into Wild after elimination
        grid[colIndex][r] = 'WX';
      } else {
        const len = strip.length;
        const drawIdx = (((drawIndices[colIndex] % len) + len) % len);
        grid[colIndex][r] = strip[drawIdx];
        drawIndices[colIndex]--;
      }
    }
  }
}
