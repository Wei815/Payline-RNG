import { BaseWayGame } from '../base/BaseWayGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import { getBaseSymbol } from '../../utils/evaluation/GameConstants';

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

  public override getMaxRandomAttempts(): number {
    return 30000;
  }

  public override isSymbolUnremovable(sym: string, _isFreeGame: boolean): boolean {
    const base = getBaseSymbol(sym);
    if (base === 'B1' || base === 'B2') {
      return true;
    }
    return false;
  }

  // 皇家金象專屬邏輯：只有 R3 (colIndex === 2) 和 R4 (colIndex === 3) 會有金色符號轉百搭
  public override applyCascade(
    grid: string[][],
    colIndex: number,
    eliminatedRows: number[],
    strip: string[],
    drawIndices: number[],
    _isFreeGame: boolean,
    _gameType: GameType
  ): void {
    eliminatedRows.sort((a, b) => b - a);
    for (const r of eliminatedRows) {
      
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

  public override calculateNextDropGrid(
    currentGrid: string[][],
    winningCoords: Map<string, number[]>,
    isFreeGame: boolean,
    pullNextSymbol: (colIndex: number, dropIndex: number, totalDropped: number) => string
  ): string[][] {
    const nextGrid: string[][] = [];
    const reelCount = currentGrid.length;

    for (let c = 0; c < reelCount; c++) {
      const colLen = currentGrid[c].length;
      const keptSymbols: string[] = [];

      for (let r = 0; r < colLen; r++) {
        const symId = currentGrid[c][r];
        const isUnremovable = this.isSymbolUnremovable(symId, isFreeGame);

        if (!winningCoords.has(`${c}-${r}`) || isUnremovable) {
          keptSymbols.push(symId);
        } else if (this.isGoldSymbol(symId)) {
          // 滾輪表設定決定了哪一軸有金框，因此不需檢查 colIndex
          keptSymbols.push('WX');
        }
      }

      const removedCount = colLen - keptSymbols.length;
      const newSymbols: string[] = [];
      for (let i = 0; i < removedCount; i++) {
        newSymbols.push(pullNextSymbol(c, i, removedCount));
      }

      nextGrid.push([...newSymbols, ...keptSymbols]);
    }

    return nextGrid;
  }
}
