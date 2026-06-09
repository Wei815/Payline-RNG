import { useState, useEffect } from 'react';
import type { PaytableRule, GameType } from '../types';
import { findRngForCombination } from '../utils/slotUtils';

export function useRngSearch(
  selectedSymbol: string,
  reelCount: number,
  rowCounts: number[],
  currentStrips: string[][],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTrackerOther: string[],
  customPaylines?: number[][]
) {
  const [combinations, setCombinations] = useState<{
    name: string;
    length: number;
    wildCount: number;
    rng: number[] | null;
    isInterfered: boolean;
  }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedSymbol || currentStrips.length === 0 || currentStrips.every(s => !s || s.length === 0)) {
      setTimeout(() => setCombinations([]), 0);
      return;
    }

    setTimeout(() => setIsSearching(true), 0);
    const timer = setTimeout(() => {
      const newCombs: typeof combinations = [];

      for (let L = 2; L <= reelCount; L++) {
        const maxWild = Math.min(1, L - 1);
        for (let W = 0; W <= maxWild; W++) {
          const name = W === 0
            ? `${selectedSymbol} * ${L} 連線`
            : `${selectedSymbol} * ${L - W} + WX`;

          const { rng, isInterfered } = findRngForCombination(
            selectedSymbol,
            L,
            W,
            currentStrips,
            rowCounts,
            currentPaytable,
            reelCount,
            gameType,
            topTrackerOther,
            customPaylines
          );

          newCombs.push({
            name,
            length: L,
            wildCount: W,
            rng,
            isInterfered
          });
        }
      }
      newCombs.sort((a, b) => {
        const getPriority = (c: typeof combinations[0]) => {
          if (!c.rng) return 2;
          return c.isInterfered ? 1 : 0;
        };
        return getPriority(a) - getPriority(b);
      });

      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther, customPaylines]);

  return { isSearching, combinations };
}
