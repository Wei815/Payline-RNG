import { defineGoldenSuite } from './harness';

defineGoldenSuite({
  gameType: 'waygame_elephant', template: 'Royal Ganesha', seed: 106, combos: true,
  searchCases: [
    { symbol: 'M1', length: 3, wildCount: 0 },
    { symbol: 'M1', length: 6, wildCount: 0 },
    { symbol: 'A', length: 4, wildCount: 1, requireGoldCascade: true },
    { symbol: 'M2', length: 3, wildCount: 0, isFreeGame: true },
  ],
});
