/**
 * RTP 模擬 Worker 黃金樣本：固定種子下，各遊戲模擬結果必須與基準完全一致
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { GameType } from '../../types';
import { buildFixture, loadTemplate, withSeed } from '../../games/base/__tests__/harness';
import type { WorkerMessageData, WorkerResponse } from '../simulation.worker';

let onmessage: (e: { data: WorkerMessageData }) => void;
let lastMessage: WorkerResponse | undefined;

beforeAll(async () => {
  const g = globalThis as unknown as { self: { postMessage: (m: WorkerResponse) => void; onmessage?: typeof onmessage } };
  g.self = { postMessage: (m: WorkerResponse) => { lastMessage = m; } };
  await import('../simulation.worker');
  onmessage = g.self.onmessage!;
});

const round = (v: unknown): unknown => {
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  if (Array.isArray(v)) return v.map(round);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)]));
  return v;
};

const CASES: [GameType, string][] = [
  ['linegame', 'Mermaid'],
  ['waygame', 'Mermaid'],
  ['payanywhere', 'Battle of Set'],
  ['payanywhere_set2', 'Battle of Set'],
  ['waygame_qin', 'Chin Shi'],
  ['waygame_elephant', 'Royal Ganesha'],
  ['linegame_set2', 'The Luxe'],
  ['linegame_gods', 'God of Wars'],
  ['linegame_roma', 'Roma'],
];

describe('simulation.worker 黃金樣本', () => {
  for (const [gameType, template] of CASES) {
    test(gameType, async () => {
      const fx = buildFixture(gameType, await loadTemplate(template));
      const base: WorkerMessageData = {
        mode: 'full_game',
        strips: fx.strips,
        freeStrips: fx.freeStrips,
        stripSets: fx.stripSets ? Object.keys(fx.stripSets).sort((a, b) => +a - +b).map(k => fx.stripSets![k]) : undefined,
        freeStripSets: fx.freeStripSets ? Object.keys(fx.freeStripSets).sort((a, b) => +a - +b).map(k => fx.freeStripSets![k]) : undefined,
        paytable: fx.paytable,
        totalSpins: 2000,
        rowCounts: fx.rowCounts,
        gameConfig: {
          gameType,
          paylines: fx.paylines,
          effectiveBet: 1,
          specialRules: { derivativeSymbols: { B1: ['B2'] }, unremovableSymbols: ['S1'] },
        },
        coin: 1,
        bet: 1,
      };
      const results: Record<string, unknown> = {};
      for (const mode of ['base_only', 'full_game'] as const) {
        lastMessage = undefined;
        await withSeed(7, () => onmessage({ data: { ...base, mode } }));
        const msg = lastMessage as WorkerResponse | undefined;
        expect(msg?.type).toBe('DONE');
        results[mode] = round((msg as Extract<WorkerResponse, { type: 'DONE' }>).result);
      }
      expect(results).toMatchSnapshot();
    });
  }
});
