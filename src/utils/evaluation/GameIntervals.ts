import type { GameType, MultiplierInterval } from '../../types';

export const DEFAULT_MULTIPLIER_INTERVALS: MultiplierInterval[] = [
  { id: '1', name: 'Big Win', min: 20, max: 50 },
  { id: '2', name: 'Super Win', min: 50, max: 100 },
  { id: '3', name: 'Mega Win', min: 100, max: 300 },
  { id: '4', name: 'Ultra Win', min: 300, max: 1000 },
  { id: '5', name: 'Legend Win', min: 1000, max: null },
];

export const LUXE_MULTIPLIER_INTERVALS: MultiplierInterval[] = [
  { id: '1', name: '大獎? (50~100)', min: 50, max: 100 },
  { id: '2', name: '大獎? (100~300)', min: 100, max: 300 },
  { id: '3', name: '大獎? (300~500)', min: 300, max: 500 },
  { id: '4', name: '大獎? (500~800)', min: 500, max: 800 },
  { id: '5', name: '大獎? (800~1000)', min: 800, max: 1000 },
  { id: '6', name: '大獎? (1000+)', min: 1000, max: null },
];

export const WAYGAME_MULTIPLIER_INTERVALS: MultiplierInterval[] = [
  { id: '1', name: 'Big Win', min: 20, max: 50 },
  { id: '2', name: 'Mega Win', min: 50, max: 300 },
  { id: '3', name: 'SuperMega Win', min: 300, max: null },
];

export function getGameIntervals(gameType: GameType): MultiplierInterval[] {
  switch (gameType) {
    case 'linegame_set2':
      return LUXE_MULTIPLIER_INTERVALS;
    case 'waygame':
      return WAYGAME_MULTIPLIER_INTERVALS;
    default:
      return DEFAULT_MULTIPLIER_INTERVALS;
  }
}
