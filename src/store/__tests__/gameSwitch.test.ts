/**
 * 切換遊戲時清掉上一款遊戲的專屬狀態（ARCHITECTURE 禁忌 4）
 */
import { describe, expect, test } from 'vitest';
import { useMachineStore } from '../useMachineStore';
import { useGameStore } from '../useGameStore';
import { GAMES } from '../../games/registry';

describe('切換遊戲', () => {
  test('免遊模式、金框、Jackpot 不殘留到新遊戲', () => {
    const [from, to] = GAMES.map(g => g.id);
    useMachineStore.getState().setGameType(from);
    useGameStore.setState({ isFreeGame: true, goldFrames: { '0-0': 2 }, jackpots: { '1-1': 'MINI' }, activeStripId: 2 } as never);

    useMachineStore.getState().setGameType(to);

    const s = useGameStore.getState();
    expect(s.isFreeGame).toBe(false);
    expect(s.goldFrames).toEqual({});
    expect(s.jackpots).toEqual({});
    expect(s.activeStripId).toBe(0);
  });

  test('幸運草、自定義盤面設定不殘留；停點欄位依目前軸數重設', () => {
    const [from, to] = GAMES.map(g => g.id);
    useMachineStore.getState().setGameType(from);
    useGameStore.setState({
      reelCount: 6, rowCounts: [5, 5, 5, 5, 5, 5],
      clovers: { '0-0': true },
      customGridData: [['M1']], customGridGoldFrames: { '0-0': 2 }, customGridJackpots: { '0-1': 'MINI' },
      customGridClovers: { '1-1': true }, customGridWyConfigs: { 1: { a: 2, b: 10, z: 0 } },
    } as never);

    useMachineStore.getState().setGameType(to);

    const s = useGameStore.getState();
    expect(s.clovers).toEqual({});
    expect(s.customGridGoldFrames).toEqual({});
    expect(s.customGridJackpots).toEqual({});
    expect(s.customGridClovers).toEqual({});
    expect(s.customGridWyConfigs).toEqual({});
    expect(s.customGridData).toEqual(Array(6).fill(Array(5).fill('')));
    expect(s.manualIndices).toHaveLength(6);
    expect(s.manualIndicesOther).toHaveLength(6);
  });

  test('重新選同一款遊戲不清除', () => {
    const id = useMachineStore.getState().gameType;
    useGameStore.setState({ isFreeGame: true });
    useMachineStore.getState().setGameType(id);
    expect(useGameStore.getState().isFreeGame).toBe(true);
  });
});
