/**
 * 平移掉落：同一軸消除多格時，留下的符號依原順序下移，新符號補在上方
 * 曾由下往上逐格下移，第一次下移後下一個待消除的列已經換成別的符號（[A,B,C,D] 消 C、D 得到 [n2,n1,A,C]）
 */
import { describe, expect, test } from 'vitest';
import { GameRegistry } from '../../../core/GameRegistry';
import type { AbstractGame } from '../AbstractGame';
import type { GameType } from '../../../types';

describe.each(['payanywhere_set2', 'linegame_roma'] as GameType[])('%s applyCascade', (gameType) => {
  const game = GameRegistry.getGame(gameType) as AbstractGame;
  const run = (col: string[], rows: number[]) => {
    const grid = [[...col]];
    // 滾輪表 n0..n9，從索引 9 往回抽：先抽 n9，再抽 n8
    game.applyCascade(grid, 0, rows, Array.from({ length: 10 }, (_, i) => `n${i}`), [9], false, gameType);
    return grid[0];
  };

  test('消除相鄰兩格', () => {
    expect(run(['A', 'B', 'C', 'D'], [2, 3])).toEqual(['n8', 'n9', 'A', 'B']);
  });
  test('消除不相鄰兩格（順序無關）', () => {
    expect(run(['A', 'B', 'C', 'D'], [3, 1])).toEqual(['n8', 'n9', 'A', 'C']);
  });
  test('消除單格', () => {
    expect(run(['A', 'B', 'C', 'D'], [2])).toEqual(['n9', 'A', 'B', 'D']);
  });
});
