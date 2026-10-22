/**
 * 目前盤面使用的滾輪表：各分頁共用 selectActiveStrips，盤面、贏分與複製出去的 Strip ID 才會一致
 * 曾經免遊盤面固定用第 0 組；改任何賠率後 currentStrips 被設定面板改回第 0 組，但 Strip ID 仍是 2
 */
import { describe, expect, test } from 'vitest';
import { selectActiveStrips, useGameStore } from '../useGameStore';

const set = (tag: string) => [[`${tag}-r0`], [`${tag}-r1`]];
const base = [set('b0'), set('b1'), set('b2')];
const free = [set('f0'), set('f1'), set('f2')];
const editor = set('editor');

describe('selectActiveStrips', () => {
  const state = (over: Partial<Parameters<typeof selectActiveStrips>[0]>) => ({
    isFreeGame: false, currentStripSets: base, currentFreeStripSets: free, activeStripId: 2, currentStrips: editor, ...over,
  });

  test('主遊戲多組：依 Strip ID，而不是設定面板編輯中的第 0 組', () => {
    expect(selectActiveStrips(state({}))).toBe(base[2]);
  });
  test('免遊：依 Strip ID 取免遊組（不再固定第 0 組）', () => {
    expect(selectActiveStrips(state({ isFreeGame: true }))).toBe(free[2]);
  });
  test('只有一組或沒有滾輪表組：使用設定面板的滾輪表（保留編輯結果）', () => {
    expect(selectActiveStrips(state({ currentStripSets: [base[0]], activeStripId: 0 }))).toBe(editor);
    expect(selectActiveStrips(state({ currentStripSets: [], currentFreeStripSets: [], activeStripId: 0 }))).toBe(editor);
  });
  test('Strip ID 超出範圍時退回第 0 組', () => {
    expect(selectActiveStrips(state({ activeStripId: 9 }))).toBe(base[0]);
  });
});

describe('切換主遊戲 / 免遊', () => {
  test('Strip ID 回到 0，避免沿用另一種模式不存在的組別', () => {
    useGameStore.setState({ isFreeGame: false, activeStripId: 2 });
    useGameStore.getState().setIsFreeGame(true);
    expect(useGameStore.getState().activeStripId).toBe(0);
  });
  test('設成相同模式時不重設', () => {
    useGameStore.setState({ isFreeGame: true, activeStripId: 2 });
    useGameStore.getState().setIsFreeGame(true);
    expect(useGameStore.getState().activeStripId).toBe(2);
  });
});
