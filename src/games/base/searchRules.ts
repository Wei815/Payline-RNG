/**
 * 反向搜尋的「干擾」判定（搜尋引擎與各遊戲的專屬搜尋共用）
 */
import type { PaytableRule } from '../../types';
import type { WinResult } from '../../utils/evaluation';

/** Scatter 達到此顆數會觸發免遊 / 特色（多數範本 B1、S1 全部 0 賠率，只靠顆數觸發） */
export const FEATURE_TRIGGER_COUNT = 3;

/**
 * 目標以外的中獎是否算干擾：有贏分，或 Scatter 達 FEATURE_TRIGGER_COUNT 顆（即使 0 賠率也會觸發特色）
 * 曾經只看贏分，0 賠率的 B1 × 3 被當成乾淨解，QA 拿到的測試盤面會意外進入特色遊戲
 */
export function isInterferingWin(w: WinResult, paytable: PaytableRule[]): boolean {
  if (w.payout > 0) return true;
  return w.matchCount >= FEATURE_TRIGGER_COUNT && paytable.some(p => p.symbolId === w.symbolId && p.isScatter);
}
