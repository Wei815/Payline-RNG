import { describe, expect, test } from 'vitest';
import { defineGoldenSuite, evalSample } from './harness';

const wyConfigs = { 1: { a: 2, b: 10, z: 0 as const }, 2: { a: 3, b: 5, z: 1 as const }, 3: { a: 4, b: 8, z: 0 as const } };

defineGoldenSuite(
  { gameType: 'linegame_gods', template: 'God of Wars', seed: 108, config: { wyConfigs } },
  getFx => {
    describe('諸神特色', () => {
      test('WY 整軸展開為 WX，多軸倍數相加', () => {
        const fx = getFx();
        const grid = [
          ['M1', 'M1', 'M1', 'M1', 'M1'],
          ['K', 'WY', 'Q', 'J', 'A'],
          ['A', 'K', 'Q', 'WY', 'J'],
          ['M1', 'A', 'K', 'Q', 'J'],
          ['Q', 'J', 'A', 'K', 'M2'],
        ];
        const sample = evalSample(fx, grid, { config: { wyConfigs } });
        expect(sample).toMatchSnapshot();
        // 軸 1 (a=2) + 軸 2 (z=1 → b=5) = 7 倍
        expect((sample.wins as string[]).some(w => w.includes('mult=7'))).toBe(true);
      });
    });
  },
);
