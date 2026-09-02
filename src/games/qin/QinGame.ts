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
    return [[], [], [], [], [], []];
  }

  public override isSymbolUnremovable(sym: string, isFreeGame: boolean): boolean {
    return isFreeGame && sym === 'S1';
  }

  // Override cascade to implement Gold -> WX rule
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
          // 在消除名單內，且是金框符號，轉為 WX 並保留
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
