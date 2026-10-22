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

  test('重新選同一款遊戲不清除', () => {
    const id = useMachineStore.getState().gameType;
    useGameStore.setState({ isFreeGame: true });
    useMachineStore.getState().setGameType(id);
    expect(useGameStore.getState().isFreeGame).toBe(true);
  });
});
