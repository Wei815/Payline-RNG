/**
 * QA 腳本 ClassIDs 解碼（測試腳本載入與 RNG 腳本驗證共用，依 traits.snippetClassIds 選擇）
 *
 * - 'coordinate'：每 3 碼 (col, row, 值)，值 0~11 為金框倍數池索引、12~15 為 Jackpot（奢華、通用線遊戲）
 * - 'wyConfig'：每 3 碼 (a, b, z) 依序對應盤面上出現 WY 的軸（諸神）
 * - 'symbolMultiplier'：依序作為 F/L 倍數球的倍數（解析盤面時逐格取用，不在此處理）
 *
 * 曾經只有測試腳本載入認得 'wyConfig'，驗證工具把諸神的 (a,b,z) 當成金框座標，WY 倍數遺失。
 */
export type JackpotType = 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN';
export interface WyConfig { a: number; b: number; z: 0 | 1 }

const POOL_INDEX_TO_MULTIPLIER: Record<number, number> = {
  0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 25, 10: 50, 11: 100,
};
const ID_TO_JACKPOT: Record<number, JackpotType> = { 12: 'MINI', 13: 'MAJOR', 14: 'MEGA', 15: 'MAXWIN' };

export function decodeCoordinateClassIds(flatClassIds: number[]): { goldFrames: Record<string, number>; jackpots: Record<string, JackpotType> } {
  const goldFrames: Record<string, number> = {};
  const jackpots: Record<string, JackpotType> = {};
  for (let i = 0; i < flatClassIds.length; i += 3) {
    const c = flatClassIds[i];
    const r = flatClassIds[i + 1];
    const v = flatClassIds[i + 2];
    if (v === undefined) continue;
    const key = `${c}-${r}`;
    if (v >= 0 && v <= 11) goldFrames[key] = POOL_INDEX_TO_MULTIPLIER[v];
    else if (v >= 12 && v <= 15) jackpots[key] = ID_TO_JACKPOT[v];
  }
  return { goldFrames, jackpots };
}

/** 依盤面上出現 WY 的軸，依序取 (a, b, z) */
export function decodeWyClassIds(flatClassIds: number[], grid: string[][]): Record<number, WyConfig> {
  const wyConfigs: Record<number, WyConfig> = {};
  let idx = 0;
  for (let c = 0; c < grid.length; c++) {
    if (grid[c].includes('WY') && idx + 2 < flatClassIds.length) {
      wyConfigs[c] = {
        a: Number(flatClassIds[idx]) || 2,
        b: Number(flatClassIds[idx + 1]) || 10,
        z: Number(flatClassIds[idx + 2]) === 1 ? 1 : 0,
      };
      idx += 3;
    }
  }
  return wyConfigs;
}
