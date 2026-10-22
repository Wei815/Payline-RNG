/**
 * QA 腳本格式黃金樣本：各遊戲 script.ts 的輸出格式（重構時已與舊版內嵌邏輯逐一比對一致）
 */
import { describe, expect, test } from 'vitest';
import type { GameType } from '../../../types';
import { getScriptFormatter, getTraits } from '../../registry';
import type { ScriptCombination, ScriptContext } from '../ScriptFormat';

const GAMES: GameType[] = ['linegame', 'waygame', 'payanywhere', 'payanywhere_set2', 'waygame_qin', 'linegame_set2', 'waygame_elephant', 'linegame_gods', 'linegame_roma', 'megaway'];
const ids = (n: number, k = 3) => Array.from({ length: n }, (_, i) => (i * k) % 23);
const COMBS: ScriptCombination[] = [
  { name: '純連線', length: 3, wildCount: 0, rng: [1, 2, 3, 4, 5, 6], isInterfered: false },
  { name: '連鎖+Strip', length: 5, wildCount: 1, rng: [7, 8, 9, 10, 11, 12, 13], isInterfered: true, stripId: 2, hasS1Drop: true, allRngs: [[1, 2, 3, 4, 5, 9], [7, 8, 9, 10, 11]] },
  { name: 'MathID', length: 9, wildCount: 0, rng: ['1,2,3', '4,5,6', '7,8,9'], isInterfered: false, fullMathIds: ids(35), dropMathIds: ids(12, 5), classStr: '[0, 1, 5]' },
];

describe('ScriptFormatter 黃金樣本', () => {
  for (const g of GAMES) {
    test(g, () => {
      const f = getScriptFormatter(g);
      const ctxs: Record<string, ScriptContext> = {
        BG: { family: getTraits(g).family, isFreeGame: false, triggerRngSequence: null, selectedTriggerCombo: 4, combinedClassIdStr: '', defaultStripId: 0 },
        FG: { family: getTraits(g).family, isFreeGame: true, triggerRngSequence: [[13, 0, 0, 0, 0], [0, 0, 0, 0, 0]], selectedTriggerCombo: 4, combinedClassIdStr: '[1, 2, 3]', defaultStripId: 3 },
      };
      const out: Record<string, unknown> = {};
      for (const [ctxName, ctx] of Object.entries(ctxs)) {
        for (const c of COMBS) {
          out[`${ctxName} ${c.name}`] = {
            copyAll: f.copyAllLine(c, ctx),
            testCase: f.testCaseRng(c, ctx),
            click: f.clickCopy(c, ctx),
            display: f.display(c, ctx),
            dropPreview: f.dropPreview(c, 4),
          };
        }
        out[`${ctxName} current`] = [false, true].map(isManualEdited =>
          f.currentRng({ targetComb: COMBS[1], formattedRngArray: ['1', '2', '3', '4', '5', '6'], isManualEdited, manualSafeRng1: [9, 9, 9, 9, 9] }, ctx));
      }
      expect(out).toMatchSnapshot();
    });
  }
});

describe('Way 遊戲腳本的 Strip ID', () => {
  const ctx: ScriptContext = {
    family: 'way', isFreeGame: false, triggerRngSequence: null, selectedTriggerCombo: 0, combinedClassIdStr: '', defaultStripId: 0,
  };
  const fmt = getScriptFormatter('waygame');
  const comb = (rng: number[], stripId?: number) => ({ name: 'x', length: 3, wildCount: 0, rng, isInterfered: false, stripId }) as ScriptCombination;

  test('5 軸、多組滾輪表：Strip ID 只出現一次（曾輸出 [停點×5, ID, ID]）', () => {
    expect(fmt.copyAllLine(comb([1, 2, 3, 4, 5, 2], 2), ctx)).toBe('[1,2,3,4,5,2],');
  });
  test('6 軸、多組滾輪表', () => {
    expect(fmt.copyAllLine(comb([1, 2, 3, 4, 5, 6, 3], 3), ctx)).toBe('[1,2,3,4,5,6,3],');
  });
  test('單組滾輪表：附加目前的 Strip ID', () => {
    expect(fmt.copyAllLine(comb([1, 2, 3, 4, 5]), { ...ctx, defaultStripId: 0 })).toBe('[1,2,3,4,5,0],');
  });
});
