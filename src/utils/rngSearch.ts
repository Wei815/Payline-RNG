import type { PaytableRule, GameType, MultiplierInterval } from '../types';
import { GameRegistry } from '../core/GameRegistry';

export async function findRngForCombination(
  targetSymbol: string,
  length: number,
  wildCount: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  stripSets?: Record<string, string[][]>,
  requireGoldCascade: boolean = false
): Promise<{ rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean; stripId?: number }> {
  const game = GameRegistry.getGame(gameType);
  return game.findRngForCombination(
    targetSymbol, length, wildCount, currentStrips, rowCounts, currentPaytable,
    reelCount, gameType, topTrackerOther, customPaylines, isFreeGame, stripSets, requireGoldCascade
  );
}

export async function findRngForCombos(
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  stripSets?: Record<string, string[][]>
): Promise<(number[] | null)[]> {
  const game = GameRegistry.getGame(gameType);
  return game.findRngForCombos(
    currentStrips, rowCounts, currentPaytable, reelCount, gameType,
    topTrackerOther, customPaylines, isFreeGame, stripSets
  );
}

export async function findRngForMultiplierIntervals(
  intervals: MultiplierInterval[],
  bet: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  stripSets?: Record<string, string[][]>
): Promise<Record<string, number[]>> {
  const game = GameRegistry.getGame(gameType);
  return game.findRngForMultiplierIntervals(
    intervals, bet, currentStrips, rowCounts, currentPaytable, reelCount,
    gameType, topTrackerOther, customPaylines, isFreeGame, stripSets
  );
}
