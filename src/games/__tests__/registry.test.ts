/**
 * 選單上能選的遊戲都必須有遊戲實作（曾經可選 Megaway，選了之後整個畫面變白）
 */
import { describe, expect, test } from 'vitest';
import { ENGINE_MENU, GAME_SELECT_GROUPS, TEMPLATE_MENU } from '../registry';
import { GameRegistry } from '../../core/GameRegistry';

describe('遊戲選單', () => {
  const ids = [
    ...ENGINE_MENU.map(e => e.id),
    ...TEMPLATE_MENU.map(t => t.id),
    ...GAME_SELECT_GROUPS.flatMap(g => g.options.map(o => o.id)),
  ];

  test.each([...new Set(ids)])('%s 有遊戲實作', id => {
    expect(GameRegistry.tryGetGame(id)).toBeDefined();
  });

  test('下拉選單沒有空的分組', () => {
    for (const g of GAME_SELECT_GROUPS) expect(g.options.length).toBeGreaterThan(0);
  });
});
