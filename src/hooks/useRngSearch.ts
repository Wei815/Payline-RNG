import { useState, useEffect } from "react";
import type { PaytableRule, GameType } from "../types";
import { findRngForCombination, findRngForCombos, findRngForMultiplierIntervals } from "../utils/rngSearch";

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
  multiplierIntervals: import("../types").MultiplierInterval[] = []
) {
  const [combinations, setCombinations] = useState<
    {
      name: string;
      length: number;
      wildCount: number;
      rng: any[] | null;
      isInterfered: boolean;
      hasS1Drop?: boolean;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedSymbol) {
      setTimeout(() => setCombinations([]), 0);
      return;
    }
    if (
      gameType !== "payanywhere_set2" &&
      gameType !== "linegame_set2" &&
      (currentStrips.length === 0 ||
        currentStrips.every((s) => !s || s.length === 0))
    ) {
      setTimeout(() => setCombinations([]), 0);
      return;
    }

    setTimeout(() => setIsSearching(true), 0);
    const timer = setTimeout(async () => {
      const newCombs: typeof combinations = [];

      if (selectedSymbol === 'COMBO') {
        const results = await findRngForCombos(
          currentStrips,
          rowCounts,
          currentPaytable,
          reelCount,
          gameType,
          topTrackerOther,
          customPaylines,
          isFreeGame
        );
        
        for (let i = 0; i < results.length; i++) {
          if (results[i]) {
            newCombs.push({
              name: `${i + 1} Combo`,
              length: i + 1,
              wildCount: 0,
              rng: results[i],
              isInterfered: false,
              hasS1Drop: false
            } as any);
          }
        }
        setCombinations(newCombs);
        setIsSearching(false);
        return;
      }

      if (selectedSymbol === 'WIN_MULTIPLIER') {
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
        setCombinations(newCombs);
        setIsSearching(false);
        return;
      }

      let minWinCount = gameType.includes('payanywhere') ? 8 : 3;
      let maxWinCount = gameType.includes('payanywhere') ? 12 : reelCount;
      const targetRule = currentPaytable.find(p => p.symbolId === selectedSymbol);
      if (targetRule && targetRule.payouts) {
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

      if (gameType === "payanywhere_set2") {
        // --- PAY ANYWHERE SET 2 GENERATOR ---
        // Target counts: 7 to 13
        let totalGridCells = 0;
        for (let c = 0; c < reelCount; c++) totalGridCells += rowCounts[c] || 3;
        // We generate 60 items: 30 for the initial grid, 30 for the drops
        const requiredTotal = totalGridCells * 2;

        // Get all available regular symbols (not target, not scatters) to fill the grid without wins
        const excludeSymbols =
          selectedSymbol === "B1/B2"
            ? ["B1", "B2", "WX", "NI", "F1", "F2", "F3", "F4", "L1", "L2"]
            : [selectedSymbol, "WX", "NI", "F1", "F2", "F3", "F4", "L1", "L2"];
        const nonScatters = currentPaytable
          .filter(
            (p) =>
              p.isEnabled !== false &&
              !p.isScatter &&
              !excludeSymbols.includes(p.symbolId),
          )
          .map((p) => p.symbolId);

        // Ensure nonScatters has symbols
        if (nonScatters.length > 0) {
          if (selectedSymbol === "B1/B2") {
            const b1b2Targets = [
              { b1: 3, b2: 0 },
              { b1: 2, b2: 1 },
              { b1: 4, b2: 0 },
              { b1: 3, b2: 1 },
              { b1: 5, b2: 0 },
              { b1: 4, b2: 1 },
              { b1: 6, b2: 0 },
              { b1: 5, b2: 1 },
            ];

            b1b2Targets.forEach((target) => {
              const grid: string[] = Array(requiredTotal).fill("-");
              const placementOrder: number[] = [];
              const maxR = Math.max(...rowCounts);
              for (let r = 0; r < maxR; r++) {
                for (let c = 0; c < reelCount; c++) {
                  const colRows = rowCounts[c] || 3;
                  if (r < colRows) {
                    placementOrder.push(c * colRows + r);
                  }
                }
              }

              for (let i = 0; i < target.b1; i++) {
                if (placementOrder[i] !== undefined)
                  grid[placementOrder[i]] = "B1";
              }
              for (let i = 0; i < target.b2; i++) {
                if (placementOrder[target.b1 + i] !== undefined)
                  grid[placementOrder[target.b1 + i]] = "B2";
              }

              let nsIdx = 0;

              const specialSymbolsToPlace: string[] = [];
              if (
                specialSymbolConfig.s1Enabled &&
                specialSymbolConfig.s1Count > 0
              ) {
                for (let i = 0; i < specialSymbolConfig.s1Count; i++)
                  specialSymbolsToPlace.push("S1");
              }
              if (
                specialSymbolConfig.s2Enabled &&
                specialSymbolConfig.s2Count > 0
              ) {
                for (let i = 0; i < specialSymbolConfig.s2Count; i++)
                  specialSymbolsToPlace.push("S2");
              }
              if (specialSymbolConfig.multipliersEnabled) {
                Object.entries(specialSymbolConfig.multiplierCounts).forEach(
                  ([key, count]) => {
                    for (let i = 0; i < count; i++)
                      specialSymbolsToPlace.push(key); // e.g. "F1_2X"
                  },
                );
              }
              if (specialSymbolConfig.luckyBallsEnabled) {
                Object.entries(specialSymbolConfig.luckyCounts).forEach(
                  ([key, count]) => {
                    for (let i = 0; i < count; i++)
                      specialSymbolsToPlace.push(key); // e.g. "L1_2X"
                  },
                );
              }

              for (let i = 0; i < requiredTotal; i++) {
                if (grid[i] === "-") {
                  if (specialSymbolsToPlace.length > 0) {
                    grid[i] = specialSymbolsToPlace.shift()!;
                  } else {
                    grid[i] = nonScatters[nsIdx % nonScatters.length];
                    nsIdx++;
                  }
                }
              }

              const mathIdMap: Record<string, string> = {};
              currentPaytable.forEach((p) => {
                if (p.mathId !== undefined) {
                  const ids = String(p.mathId)
                    .split(",")
                    .map((s) => s.trim());
                  mathIdMap[p.symbolId] = ids[0];
                }
              });

              const columnStrings: string[] = [];
              let cellPointer = 0;
              for (let c = 0; c < reelCount; c++) {
                const colRows = rowCounts[c] || 3;
                const colArr = [];
                for (let r = 0; r < colRows; r++) {
                  colArr.push(
                    mathIdMap[grid[cellPointer]] || grid[cellPointer],
                  );
                  cellPointer++;
                }
                columnStrings.push(colArr.join(","));
              }

              const fullMathIds = grid.map((s) => {
                if (mathIdMap[s]) return mathIdMap[s];
                if (s.includes("_") && s.match(/^[F|L][1-4]_/)) {
                  if (s.startsWith("F")) return "15";
                  if (s.startsWith("L")) return "19";
                  const base = s.split("_")[0];
                  return mathIdMap[base] || base;
                }
                return s;
              });

              const dropMathIds = [];
              for (let i = 0; i < 50; i++) {
                const sym =
                  nonScatters[Math.floor(Math.random() * nonScatters.length)];
                dropMathIds.push(mathIdMap[sym] || sym);
              }

              newCombs.push({
                name: `B1*${target.b1}${target.b2 > 0 ? "+B2" : ""}`,
                length: target.b1 + target.b2,
                wildCount: 0,
                rng: columnStrings as any,
                isInterfered: false,
              });
              (newCombs[newCombs.length - 1] as any).fullMathIds = fullMathIds;
              (newCombs[newCombs.length - 1] as any).dropMathIds = dropMathIds;
            });
          } else {
            let requiredTotal = 0;
            for (let c = 0; c < reelCount; c++)
              requiredTotal += rowCounts[c] || 3;

            const endLen = Math.max(startLen + 1, maxWinCount + 1);
            for (let N = startLen; N <= endLen; N++) {
              const grid: string[] = Array(requiredTotal).fill("-");

              // Generate placement order (top rows first, filling across columns)
              const placementOrder: number[] = [];
              const maxR = Math.max(...rowCounts);
              for (let r = 0; r < maxR; r++) {
                for (let c = 0; c < reelCount; c++) {
                  const colRows = rowCounts[c] || 3;
                  if (r < colRows) {
                    let offset = 0;
                    for (let k = 0; k < c; k++) offset += rowCounts[k] || 3;
                    placementOrder.push(offset + r);
                  }
                }
              }

              // Distribute N target symbols deterministically
              for (let i = 0; i < N; i++) {
                const idx = placementOrder[i];
                if (idx !== undefined) {
                  grid[idx] = selectedSymbol;
                }
              }

              // Fill the rest with distributed nonScatters to prevent wins (<8 occurrences globally)
              // Distribute evenly so no symbol exceeds 7.
              let nsIdx = 0;
              const specialSymbolsToPlace: string[] = [];
              if (
                specialSymbolConfig.s1Enabled &&
                specialSymbolConfig.s1Count > 0 &&
                selectedSymbol !== "S1"
              ) {
                for (let i = 0; i < specialSymbolConfig.s1Count; i++)
                  specialSymbolsToPlace.push("S1");
              }
              if (
                specialSymbolConfig.s2Enabled &&
                specialSymbolConfig.s2Count > 0 &&
                selectedSymbol !== "S2"
              ) {
                for (let i = 0; i < specialSymbolConfig.s2Count; i++)
                  specialSymbolsToPlace.push("S2");
              }
              if (specialSymbolConfig.multipliersEnabled) {
                Object.entries(specialSymbolConfig.multiplierCounts).forEach(
                  ([key, count]) => {
                    for (let i = 0; i < count; i++)
                      specialSymbolsToPlace.push(key);
                  },
                );
              }
              if (specialSymbolConfig.luckyBallsEnabled) {
                Object.entries(specialSymbolConfig.luckyCounts).forEach(
                  ([key, count]) => {
                    for (let i = 0; i < count; i++)
                      specialSymbolsToPlace.push(key);
                  },
                );
              }

              for (let i = 0; i < requiredTotal; i++) {
                if (grid[i] === "-") {
                  if (specialSymbolsToPlace.length > 0) {
                    grid[i] = specialSymbolsToPlace.shift()!;
                  } else {
                    grid[i] = nonScatters[nsIdx % nonScatters.length];
                    nsIdx++;
                  }
                }
              }

              // Convert symbols to their MathIDs
              const mathIdMap: Record<string, string> = {};
              currentPaytable.forEach((p) => {
                if (p.mathId !== undefined) {
                  // Take the first MathID if there are multiple (e.g., F1: 15,16,17,18)
                  const ids = String(p.mathId)
                    .split(",")
                    .map((s) => s.trim());
                  mathIdMap[p.symbolId] = ids[0];
                }
              });

              // Convert to column-based strings for manualIndicesOther
              const columnStrings: string[] = [];
              let cellPointer = 0;
              for (let c = 0; c < reelCount; c++) {
                const colRows = rowCounts[c] || 3;
                const colArr = [];
                for (let r = 0; r < colRows; r++) {
                  colArr.push(
                    mathIdMap[grid[cellPointer]] || grid[cellPointer],
                  );
                  cellPointer++;
                }
                columnStrings.push(colArr.join(","));
              }

              // Also attach the full 60-array MathIDs for the clipboard copying in SlotGeneratorTab
              // We use a custom object format in rng array for this specific case
              const fullMathIds = grid.map((s) => {
                if (mathIdMap[s]) return mathIdMap[s];
                if (s.includes("_") && s.match(/^[F|L][1-4]_/)) {
                  if (s.startsWith("F")) return "15";
                  if (s.startsWith("L")) return "19";
                  const base = s.split("_")[0];
                  return mathIdMap[base] || base;
                }
                return s;
              });

              const dropMathIds = [];
              for (let i = 0; i < 50; i++) {
                const sym =
                  nonScatters[Math.floor(Math.random() * nonScatters.length)];
                dropMathIds.push(mathIdMap[sym] || sym);
              }

              newCombs.push({
                name:
                  gameType === "payanywhere_set2" ||
                  gameType === "linegame_set2"
                    ? N < minWinCount
                      ? `無贏分 (1)\n${selectedSymbol} 個數 ${N}`
                      : `有贏分 (1)\n${selectedSymbol} 個數 ${N}`
                    : `${selectedSymbol} * ${N} 連線`,
                length: N,
                wildCount: 0,
                rng: columnStrings as any, // Visual columns
                isInterfered: false,
              });
              // Attach the arrays to the comb object dynamically
              (newCombs[newCombs.length - 1] as any).fullMathIds = fullMathIds;
              (newCombs[newCombs.length - 1] as any).dropMathIds = dropMathIds;
            }
          }
        }
      } else if (gameType === "linegame_set2") {
        // --- LINE GAME SET 2 GENERATOR ---
        const excludeSymbols = [
          selectedSymbol,
          "WX",
          "NI",
          "F1",
          "F2",
          "F3",
          "F4",
          "L1",
          "L2",
        ];
        const nonScatters = currentPaytable
          .filter(
            (p) =>
              p.isEnabled !== false &&
              !p.isScatter &&
              !excludeSymbols.includes(p.symbolId),
          )
          .map((p) => p.symbolId);
        const isSelScatter = currentPaytable.some(
          (p) => p.symbolId === selectedSymbol && p.isScatter,
        );

        if (nonScatters.length > 0) {
          const linesToUse =
            customPaylines && customPaylines.length > 0
              ? customPaylines
              : [Array(reelCount).fill(0)];
          const targetLengths = [];
          for (let l = startLen; l <= reelCount; l++) {
             targetLengths.push(l);
          }

          const mathIdMap: Record<string, string> = {};
          currentPaytable.forEach((p) => {
            if (p.mathId !== undefined) {
              const ids = String(p.mathId)
                .split(",")
                .map((s) => s.trim());
              mathIdMap[p.symbolId] = ids[0];
            }
          });

          targetLengths.forEach((len) => {
            const maxWild = isSelScatter ? 0 : Math.min(1, len - 1);
            for (let W = 0; W <= maxWild; W++) {
              const line = linesToUse[0];

              const grid: string[][] = Array.from({ length: reelCount }, (_, c) =>
                Array(rowCounts[c] || 3).fill("-"),
              );

              // Place targets and wilds
              for (let c = 0; c < len; c++) {
                if (W === 1 && c === 1) {
                   grid[c][line[c]] = "WX";
                } else {
                   grid[c][line[c]] = selectedSymbol;
                }
              }

              const flatGrid: { c: number; r: number; val: string }[] = [];
              for (let c = 0; c < reelCount; c++) {
                for (let r = 0; r < (rowCounts[c] || 3); r++) {
                  flatGrid.push({ c, r, val: grid[c][r] });
                }
              }

              const specialSymbolsToPlace: string[] = [];
              if (
                specialSymbolConfig.s1Enabled &&
                specialSymbolConfig.s1Count > 0
              ) {
                for (let i = 0; i < specialSymbolConfig.s1Count; i++)
                  specialSymbolsToPlace.push("S1");
              }
              if (
                specialSymbolConfig.s2Enabled &&
                specialSymbolConfig.s2Count > 0
              ) {
                for (let i = 0; i < specialSymbolConfig.s2Count; i++)
                  specialSymbolsToPlace.push("S2");
              }
              if (specialSymbolConfig.multipliersEnabled) {
                Object.entries(specialSymbolConfig.multiplierCounts).forEach(
                  ([key, count]) => {
                    for (let i = 0; i < count; i++)
                      specialSymbolsToPlace.push(key);
                  },
                );
              }

              let nsIdx = 0;
              const emptySpots = flatGrid.filter((cell) => cell.val === "-");
              emptySpots.sort(() => Math.random() - 0.5);

              const safeNonScatters = nonScatters.filter((sym) => sym !== selectedSymbol);

              for (let i = 0; i < emptySpots.length; i++) {
                if (specialSymbolsToPlace.length > 0) {
                  emptySpots[i].val = specialSymbolsToPlace.shift()!;
                } else {
                  emptySpots[i].val = safeNonScatters[nsIdx % safeNonScatters.length];
                  nsIdx++;
                }
              }

              const fullMathIds: string[] = [];
              const columnStrings: string[] = [];
              for (let c = 0; c < reelCount; c++) {
                const colArr: string[] = [];
                for (let r = 0; r < (rowCounts[c] || 3); r++) {
                  const cell = flatGrid.find(
                    (cell) => cell.c === c && cell.r === r,
                  )!;
                  let s = cell.val;
                  let mathId = mathIdMap[s] || s;
                  if (s.includes("_") && s.match(/^[F|L][1-4]_/)) {
                    if (s.startsWith("F")) mathId = "15";
                    else if (s.startsWith("L")) mathId = "19";
                    else {
                      const base = s.split("_")[0];
                      mathId = mathIdMap[base] || base;
                    }
                  }
                  fullMathIds.push(mathId);
                  colArr.push(mathId);
                }
                columnStrings.push(colArr.join(","));
              }

              let name = "";
              if (isSelScatter) {
                name = W === 0
                  ? `${selectedSymbol} * ${len} 個 (任意位置)`
                  : `${selectedSymbol} * ${len - W} + WX (任意位置)`;
              } else {
                name = W === 0
                  ? `${selectedSymbol} * ${len} 連線 (Line 1)`
                  : `${selectedSymbol} * ${len - W} + WX (Line 1)`;
              }

              newCombs.push({
                name: name,
                length: len,
                wildCount: W,
                rng: columnStrings,
                isInterfered: false,
                fullMathIds: fullMathIds,
              } as any);
            }
          });
        }
      } else {
        // --- STANDARD RNG SEARCH ---
        const isSelScatter = currentPaytable.some(
          (p) => p.symbolId === selectedSymbol && p.isScatter,
        );
        for (let L = startLen; L <= reelCount; L++) {
          const maxWild = Math.min(1, L - 1);
          for (let W = 0; W <= maxWild; W++) {
            let name = "";
            if (isSelScatter) {
              name =
                W === 0
                  ? `${selectedSymbol} * ${L} 個 (任意位置)`
                  : `${selectedSymbol} * ${L - W} + WX (任意位置)`;
            } else {
              name =
                W === 0
                  ? `${selectedSymbol} * ${L} 連線`
                  : `${selectedSymbol} * ${L - W} + WX`;
            }
            const { rng, isInterfered, hasS1Drop } = await findRngForCombination(
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
            );

            newCombs.push({
              name: name,
              length: L,
              wildCount: W,
              rng: rng,
              isInterfered: isInterfered,
              hasS1Drop: hasS1Drop,
            });
          }
        }
        newCombs.sort((a, b) => {
          const getPriority = (c: (typeof combinations)[0]) => {
            if (!c.rng) return 2;
            return c.isInterfered ? 1 : 0;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pA - pB;

          if (a.length !== b.length) return a.length - b.length;
          return a.wildCount - b.wildCount;
        });
      }

      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [
    selectedSymbol,
    reelCount,
    rowCounts,
    currentStrips,
    currentPaytable,
    gameType,
    topTrackerOther,
    specialSymbolConfig,
    customPaylines,
  ]);

  return { isSearching, combinations };
}
