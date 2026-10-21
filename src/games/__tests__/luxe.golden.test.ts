import { describe, expect, test } from 'vitest';
import { defineGoldenSuite, evalSample } from './harness';

const goldFrames = { '0-0': 2, '1-1': 5, '2-2': 10, '4-3': 3 };
const jackpots = { '1-0': 'MINI', '3-1': 'MAJOR', '2-3': 'MEGA' } as const;

defineGoldenSuite(
  {
    gameType: 'linegame_set2', template: 'The Luxe', seed: 107,
    extraSymbols: ['F1_2X', 'F2_5X', 'L3_10X'],
    config: { goldFrames, jackpots },
  },
  getFx => {
    describe('奢華特色', () => {
      test('金框 / Jackpot / S1 幸運草收集', () => {
        const fx = getFx();
        const grid = [
          ['M1', 'M1', 'S1', 'K'],
          ['M1', 'M1', 'Q', 'J'],
          ['WX', 'A', 'S1', 'K'],
          ['M1', 'F2_5X', 'Q', 'J'],
          ['K', 'A', 'S1', 'Q'],
        ];
        expect(evalSample(fx, grid, { config: { goldFrames, jackpots } })).toMatchSnapshot();
      });
    });
  },
);
