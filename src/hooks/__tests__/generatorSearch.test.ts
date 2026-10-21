/**
 * 「連線測試產生器」搜尋流程黃金樣本：固定種子下，各遊戲產出的組合清單必須與基準一致
 */
import { describe, expect, test } from 'vitest';
import type { GameType, SpecialSymbolConfig } from '../../types';
import { buildFixture, loadTemplate, searchTargets, withSeed } from '../../games/base/__tests__/harness';
import { runGeneratorSearch } from '../generatorSearch';
import { getGameIntervals } from '../../utils/evaluation/GameIntervals';
import { defaultSpecialSymbolConfig } from '../../store/useGameStore';

const ENABLED: SpecialSymbolConfig = {
  s1Enabled: true, s1Count: 2,
  s2Enabled: true, s2Count: 1,
  multipliersEnabled: true, multiplierCounts: { F1_2X: 1, F3_10X: 1 },
  luckyBallsEnabled: true, luckyCounts: { L1_2X: 1 },
};

const CASES: { gameType: GameType; template: string; extraSymbols?: string[]; freeGame?: boolean; combo?: boolean }[] = [
  { gameType: 'linegame', template: 'Mermaid' },
  { gameType: 'waygame', template: 'Mermaid', combo: true },
  { gameType: 'payanywhere', template: 'Battle of Set', combo: true },
  { gameType: 'payanywhere_set2', template: 'Battle of Set', extraSymbols: ['B1/B2'] },
  { gameType: 'waygame_qin', template: 'Chin Shi' },
  { gameType: 'waygame_elephant', template: 'Royal Ganesha' },
  { gameType: 'linegame_set2', template: 'The Luxe' },
  { gameType: 'linegame_gods', template: 'God of Wars', freeGame: true },
  { gameType: 'linegame_roma', template: 'Roma', combo: true },
];

const summarize = (combs: Awaited<ReturnType<typeof runGeneratorSearch>>) =>
  combs.map(c => JSON.stringify(c));

describe('runGeneratorSearch 黃金樣本', () => {
  for (const cs of CASES) {
    test(cs.gameType, async () => {
      const fx = buildFixture(cs.gameType, await loadTemplate(cs.template));
      const symbols = [...searchTargets(fx, 2), ...(cs.extraSymbols ?? []), 'WIN_MULTIPLIER', ...(cs.combo ? ['COMBO'] : [])];
      const out: Record<string, string[]> = {};
      let seed = 1;
      for (const selectedSymbol of symbols) {
        for (const [cfgName, specialSymbolConfig] of [['default', defaultSpecialSymbolConfig], ['enabled', ENABLED]] as const) {
          for (const isFreeGame of cs.freeGame ? [false, true] : [false]) {
            // 一般搜尋引擎不讀 specialSymbolConfig，只對 MathID 即時產生器跑兩種設定以節省時間
            if (cfgName === 'enabled' && !['payanywhere_set2', 'linegame_set2', 'linegame_gods'].includes(cs.gameType)) continue;
            const res = await withSeed(seed++, () => runGeneratorSearch({
              selectedSymbol,
              reelCount: fx.reelCount,
              rowCounts: fx.rowCounts,
              currentStrips: fx.strips,
              currentPaytable: fx.paytable,
              gameType: cs.gameType,
              topTrackerOther: ['WX', 'WX', 'WX', 'WX'],
              specialSymbolConfig,
              customPaylines: fx.paylines,
              isFreeGame,
              bet: 1,
              multiplierIntervals: getGameIntervals(cs.gameType),
              stripSets: fx.stripSets,
            }));
            out[`${selectedSymbol} ${cfgName}${isFreeGame ? ' FG' : ''}`] = summarize(res);
          }
        }
      }
      expect(out).toMatchSnapshot();
    }, 300_000);
  }
});
