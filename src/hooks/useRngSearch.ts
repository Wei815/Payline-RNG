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


  // 所有會影響搜尋結果的輸入；內容改變才重新搜尋
  // （曾只比對滾輪長度 + 第一軸前 3 格、賠率表只比對啟用狀態，改賠率 / 列數 / 倍數球設定都不會重新產生）
  const searchKey = JSON.stringify({
    selectedSymbol, reelCount, rowCounts, currentStrips, gameType, topTrackerOther, specialSymbolConfig,
    customPaylines, isFreeGame, bet, multiplierIntervals, stripSets,
    paytable: currentPaytable.map(p => [p.symbolId, p.payouts, p.isEnabled, p.isWild, p.isScatter, p.mathId]),
  });

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

    // 輸入改變後，較早開始的搜尋即使晚完成也要丟棄結果（例如快速從 M1 切到 M2，M1 的清單不可蓋掉 M2）
    let cancelled = false;
    const timer = setTimeout(async () => {
      const newCombs = await runGeneratorSearch({
        selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther,
        specialSymbolConfig, customPaylines, isFreeGame, bet, multiplierIntervals, stripSets,
      });
      if (cancelled) return;
      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // searchKey 已涵蓋所有輸入的內容；直接列物件會因每次 render 產生新參照而不斷重搜
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  return { isSearching, combinations };
}
