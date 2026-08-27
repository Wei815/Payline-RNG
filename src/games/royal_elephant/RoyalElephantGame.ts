import { BaseWayGame } from '../base/BaseWayGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class RoyalElephantGame extends BaseWayGame {
  readonly id: GameType = 'waygame_elephant';
  readonly name = '皇家金象 (Royal Elephant)';

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

  // 皇家金象專屬邏輯：只有 R3 (colIndex === 2) 和 R4 (colIndex === 3) 會有金色符號轉百搭
  protected override applyCascade(
    grid: string[][],
    colIndex: number,
    eliminatedRows: number[],
    strip: string[],
    drawIndices: number[],
    isFreeGame: boolean,
    _gameType: GameType
  ): void {
    eliminatedRows.sort((a, b) => b - a);
    for (const r of eliminatedRows) {
      if (isFreeGame && grid[colIndex][r] === 'S1') {
        continue;
      }
      
      const sym = grid[colIndex][r];
      const isGold = this.isGoldSymbol(sym);
      
      if ((colIndex === 2 || colIndex === 3) && isGold) {
        // 只有 R3, R4 的金色符號消除後會轉換為 WX
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
