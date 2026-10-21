import { useState, useEffect } from "react";
import type { PaytableRule, GameType } from "../types";
import { getTraits } from "../games/registry";
import { runGeneratorSearch, type GeneratorCombination } from "./generatorSearch";

export function useRngSearch(
  selectedSymbol: string,
  reelCount: number,
  rowCounts: number[],
  currentStrips: string[][],
  currentPaytable: PaytableRule[],
  gameType: GameType,
  topTrackerOther: string[],
  specialSymbolConfig: import("../types").SpecialSymbolConfig,
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  bet: number = 1,
  multiplierIntervals: import("../types").MultiplierInterval[] = [],
  stripSets?: Record<string, string[][]>
) {
  const [combinations, setCombinations] = useState<GeneratorCombination[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);


  const multiplierIntervalsStr = JSON.stringify(multiplierIntervals);
  const stripsSignature = (currentStrips || []).map(s => s ? s.length : 0).join(',') + '_' + ((currentStrips && currentStrips[0]) ? currentStrips[0].slice(0, 3).join('-') : '');
  const paytableSignature = (currentPaytable || []).map(p => `${p.symbolId}:${p.isEnabled}`).join(',');
  const paylinesSignature = (customPaylines || []).length;
  const stripSetsSignature = stripSets ? Object.keys(stripSets).length : 0;

  useEffect(() => {
    if (!selectedSymbol) {
      setCombinations([]);
      setIsSearching(false);
      return;
    }
    if (
      !getTraits(gameType).mathIdGenerator &&
      (currentStrips.length === 0 ||
        currentStrips.every((s) => !s || s.length === 0))
    ) {
      setCombinations([]);
      setIsSearching(false);
      return;
    }

    const isInstantGenerator = getTraits(gameType).mathIdGenerator;
    if (!isInstantGenerator) {
      setIsSearching(true);
    }

    const timer = setTimeout(async () => {
      const newCombs = await runGeneratorSearch({
        selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther,
        specialSymbolConfig, customPaylines, isFreeGame, bet, multiplierIntervals, stripSets,
      });
      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedSymbol,
    multiplierIntervalsStr,
    isFreeGame,
    gameType,
    stripsSignature,
    paytableSignature,
    paylinesSignature,
    stripSetsSignature
  ]);

  return { isSearching, combinations };
}
