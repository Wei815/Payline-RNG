/**
 * 「連線測試產生器」的搜尋流程（純函式版，由 useRngSearch 呼叫）
 */
import type { GeneratorCombination, GeneratorSearchParams } from "../games/base/InstantGenerator";
import { findRngForCombination, findRngForCombos, findRngForMultiplierIntervals } from "../utils/rngSearch";
import { getManifest, getTraits } from "../games/registry";
import { DEFAULT_PAY_ANYWHERE_THRESHOLDS } from "../utils/evaluation/GameConstants";

export type { GeneratorCombination, GeneratorSearchParams };

export async function runGeneratorSearch(params: GeneratorSearchParams): Promise<GeneratorCombination[]> {
  const {
    selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, gameType, topTrackerOther,
    specialSymbolConfig, customPaylines, isFreeGame, bet, multiplierIntervals, stripSets,
  } = params;
  const newCombs: GeneratorCombination[] = [];

  if (selectedSymbol === 'COMBO') {
    const results = await findRngForCombos(
      currentStrips,
      rowCounts,
      currentPaytable,
      reelCount,
      gameType,
      topTrackerOther,
      customPaylines,
      isFreeGame,
      stripSets
    );
    
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        newCombs.push({
          name: `${i + 1} Combo`,
          length: i + 1,
          wildCount: 0,
          rng: results[i],
          isInterfered: false,
          hasS1Drop: false,
          allRngs: (results[i] as any)?.allRngs || (results[i] ? [results[i]] : undefined)
        } as any);
      }
    }
    return newCombs;
  }

  if (selectedSymbol === 'WIN_MULTIPLIER') {
    const validIntervals = (multiplierIntervals || []).filter(
      iv => iv.min >= 0 && (iv.max === null || (iv.max >= 0 && iv.max >= iv.min))
    );
    if (validIntervals.length === 0) {
      return [];
    }
    // 遊戲自帶大獎區間產生器（例如奢華 / 諸神的 MathID 即時產生）
    const instantMultiplier = getManifest(gameType)?.instantGenerator?.multiplierIntervals;
    if (instantMultiplier) {
      return instantMultiplier(params, validIntervals);
    }

    const results = await findRngForMultiplierIntervals(
      multiplierIntervals,
      bet,
      currentStrips,
      rowCounts,
      currentPaytable,
      reelCount,
      gameType,
      topTrackerOther,
      customPaylines,
      isFreeGame
    );
    
    for (const interval of multiplierIntervals) {
      if (results[interval.id]) {
        newCombs.push({
          name: interval.name,
          length: 0,
          wildCount: 0,
          rng: results[interval.id],
          isInterfered: false,
          hasS1Drop: false
        } as any);
      }
    }
    return newCombs;
  }

  let minWinCount = getTraits(gameType).family === 'payanywhere' ? 8 : 3;
  let maxWinCount = getTraits(gameType).family === 'payanywhere' ? 12 : reelCount;
  const targetRule = currentPaytable.find(p => p.symbolId === selectedSymbol);
  // Pay Anywhere（非 Scatter）：match3/4/5 代表個數門檻 8/10/12，不是個數本身
  const payAnywhereTierCounts = getTraits(gameType).family === 'payanywhere' && targetRule && !targetRule.isScatter
    ? (['match3', 'match4', 'match5'] as const)
        .filter(k => (targetRule.payouts?.[k] ?? 0) > 0)
        .map(k => DEFAULT_PAY_ANYWHERE_THRESHOLDS[k])
    : null;
  if (payAnywhereTierCounts) {
    if (payAnywhereTierCounts.length > 0) {
      minWinCount = Math.min(...payAnywhereTierCounts);
      maxWinCount = Math.max(...payAnywhereTierCounts);
    }
  } else if (targetRule && targetRule.payouts) {
    const matchKeys = Object.keys(targetRule.payouts)
      .filter(k => k.startsWith('match') && targetRule.payouts[k] > 0)
      .map(k => parseInt(k.replace('match', ''), 10))
      .filter(n => !isNaN(n));
    if (matchKeys.length > 0) {
      minWinCount = Math.min(...matchKeys);
      maxWinCount = Math.max(...matchKeys);
    }
  }
  const startLen = Math.max(1, minWinCount - 1);

  // MathID 即時產生器（決戰賽特2 / 奢華 / 諸神）：直接組出盤面，不需反向搜尋滾輪表
  const instantGenerator = getManifest(gameType)?.instantGenerator;
  if (instantGenerator) {
    newCombs.push(...instantGenerator.combos({ ...params, minWinCount, maxWinCount, startLen }));
  } else {
    // --- STANDARD RNG SEARCH ---
    const isSelScatter = currentPaytable.some(
      (p) => p.symbolId === selectedSymbol && p.isScatter,
    );
    const searchTasks: {
      name: string;
      length: number;
      wildCount: number;
      promise: Promise<{ rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean }>;
    }[] = [];

    // 先跑所有「純連線」（W=0，由少到多），再跑所有「+WX」（W=1，由少到多）
    // 這樣清單左欄是純連線（上到下），右欄是含WX（上到下）
    const isTargetWild = selectedSymbol.toUpperCase() === 'WX' || selectedSymbol.toUpperCase() === 'WILD' || selectedSymbol.toUpperCase() === 'WW';
    // Pay Anywhere 的百搭不參與計數，不產生「+WX」組合
    const maxW = isTargetWild || getTraits(gameType).family === 'payanywhere' ? 0 : 1;

    // Pay Anywhere：中獎看全盤個數是否達門檻（match3/4/5 = 8/10/12 個），不是連線數；百搭不參與計數
    const payAnywhereTiers = isTargetWild ? null : payAnywhereTierCounts;
    for (const count of payAnywhereTiers ?? []) {
      searchTasks.push({
        name: `${selectedSymbol} * ${count} 個`,
        length: count,
        wildCount: 0,
        promise: findRngForCombination(
          selectedSymbol, count, 0, currentStrips, rowCounts, currentPaytable, reelCount, gameType,
          topTrackerOther, customPaylines, isFreeGame, stripSets, false,
        ),
      });
    }

    for (let W = 0; !payAnywhereTiers && W <= maxW; W++) {
      for (let L = startLen; L <= reelCount; L++) {
        if (W === 1 && L < 2) continue; // WX 至少需要 L>=2（1個symbol+1個WX）
        const maxWild = Math.min(1, L - 1);
        if (W > maxWild) continue;

        let name = "";
        if (isTargetWild) {
          name = `${selectedSymbol} * ${L} 連線`;
        } else if (isSelScatter) {
          name =
            W === 0
              ? `${selectedSymbol} * ${L} 個`
              : `${selectedSymbol} * ${L - W} + WX`;
        } else {
          name =
            W === 0
              ? `${selectedSymbol} * ${L} 連線`
              : `${selectedSymbol} * ${L - W} + WX`;
        }
        searchTasks.push({
          name,
          length: L,
          wildCount: W,
          promise: findRngForCombination(
            selectedSymbol,
            L,
            W,
            currentStrips,
            rowCounts,
            currentPaytable,
            reelCount,
            gameType,
            topTrackerOther,
            customPaylines,
            isFreeGame,
            stripSets,
            !!getTraits(gameType).goldCascadeSearch && W > 0
          ),
        });
      }
    }

    const results = await Promise.all(searchTasks.map((t) => t.promise));
    for (let i = 0; i < searchTasks.length; i++) {
      const task = searchTasks[i];
      const res = results[i];
      newCombs.push({
        name: task.name,
        length: task.length,
        wildCount: task.wildCount,
        rng: res.rng,
        isInterfered: res.isInterfered,
        hasS1Drop: res.hasS1Drop,
        stripId: (res as any).stripId,
        allRngs: (res as any)?.allRngs,
      });
    }


  }

  return newCombs;
}
