/**
 * 判斷一筆 QA 腳本的 RNG 是「MathID 盤面」還是「滾輪停點（+ Strip ID）」
 *
 * - MathID 驅動的遊戲（決戰賽特2 / 奢華 / 諸神）一律是 MathID 盤面
 * - 其他遊戲：每軸一個停點，可再多一碼 Strip ID；長度明顯超過軸數才視為 MathID 盤面
 *
 * 注意：不可用 ClassID 的解讀方式（snippetClassIds）來判斷 —— 通用 Line Game 的 ClassID 是座標式，
 * 但它的 RNG 仍是滾輪停點（曾因此把停點當 MathID，驗證工具顯示 0 分、腳本載入成空盤）。
 */
import type { GameType } from '../types';
import { findTraits } from '../games/registry';

export function isMathIdRng(gameType: GameType | string, rng: unknown[], reelCount: number): boolean {
  if (findTraits(gameType)?.mathIdGenerator) return true;
  return rng.length > reelCount + 4;
}
