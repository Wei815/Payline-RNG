import type { GameType, MultiplierInterval } from '../../types';
import { getManifest } from '../../games/registry';

export const DEFAULT_MULTIPLIER_INTERVALS: MultiplierInterval[] = [
  { id: '1', name: 'Big Win', min: 20, max: 50 },
  { id: '2', name: 'Super Win', min: 50, max: 100 },
  { id: '3', name: 'Mega Win', min: 100, max: 300 },
  { id: '4', name: 'Ultra Win', min: 300, max: 1000 },
  { id: '5', name: 'Legend Win', min: 1000, max: null },
];

/** 大獎倍數區間：遊戲可在 manifest.multiplierIntervals 自訂，否則使用預設 */
export function getGameIntervals(gameType: GameType): MultiplierInterval[] {
  return getManifest(gameType)?.multiplierIntervals ?? DEFAULT_MULTIPLIER_INTERVALS;
}
