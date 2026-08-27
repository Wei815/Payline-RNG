import { useState, useEffect } from "react";
import type { PaytableRule, GameType } from "../types";
import { findRngForCombination, findRngForCombos, findRngForMultiplierIntervals } from "../utils/rngSearch";
import { evaluateGrid, defaultPaylines } from "../utils/evaluation";

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
  const [combinations, setCombinations] = useState<
    {
      name: string;
      length: number;
      wildCount: number;
      rng: any[] | null;
      isInterfered: boolean;
      hasS1Drop?: boolean;
      stripId?: number;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);


  const multiplierIntervalsStr = JSON.stringify(multiplierIntervals);

  useEffect(() => {
    if (!selectedSymbol) {
      setCombinations([]);
      setIsSearching(false);
      return;
    }
    if (
      gameType !== "payanywhere_set2" &&
      gameType !== "linegame_set2" &&
      (currentStrips.length === 0 ||
        currentStrips.every((s) => !s || s.length === 0))
    ) {
      setCombinations([]);
      setIsSearching(false);
      return;
    }

    const isInstantGenerator = gameType === "linegame_set2" || gameType === "payanywhere_set2";
    if (!isInstantGenerator) {
      setIsSearching(true);
    }

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
        const validIntervals = (multiplierIntervals || []).filter(
          iv => iv.min >= 0 && (iv.max === null || (iv.max >= 0 && iv.max >= iv.min))
        );
        if (validIntervals.length === 0) {
          setCombinations([]);
          setIsSearching(false);
          return;
        }
        if (gameType === 'linegame_set2') {
          const mathIdMap: Record<string, string> = {};
          currentPaytable.forEach((p) => {
            if (p.mathId !== undefined) {
              const ids = String(p.mathId)
                .split(",")
                .map((s) => s.trim());
              mathIdMap[p.symbolId] = ids[0];
            }
          });

          const excludeSymbols = [
            "W", "W1", "W2", "WX", "WILD", "B1", "B2", "S1", "S2", "NI",
            "F1", "F2", "F3", "F4", "L1", "L2",
          ];
          const nonScatters = currentPaytable
            .filter(
              (p) =>
                p.isEnabled !== false &&
                !p.isScatter &&
                !excludeSymbols.includes(p.symbolId),
            )
            .map((p) => p.symbolId);

          const linesToUse =
            customPaylines && customPaylines.length > 0
              ? customPaylines
              : defaultPaylines;

          const multiplierToPoolIndex: Record<number, number> = {
            2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 25: 9, 50: 10, 100: 11
          };
          const typeToId: Record<string, number> = { 'MINI': 12, 'MAJOR': 13, 'MEGA': 14, 'MAXWIN': 15 };

          // Build possible single-row hit definitions
          const possibleRowHits: { sym: string; len: number }[] = [{ sym: '', len: 0 }];
          for (const sym of nonScatters) {
            const rule = currentPaytable.find((p) => p.symbolId === sym);
            if (!rule || !rule.payouts) continue;
            for (let l = 3; l <= reelCount; l++) {
              const pVal = Number(rule.payouts[`match${l}` as keyof typeof rule.payouts] || 0);
              if (pVal > 0) {
                possibleRowHits.push({ sym, len: l });
              }
            }
          }

          // Evaluate candidate grid
          const evaluateCandidate = (
            hit0: { sym: string; len: number },
            hit1: { sym: string; len: number },
            hit2: { sym: string; len: number },
            goldFrames: Record<string, number> = {},
            jackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {}
          ) => {
            const grid: string[][] = Array.from({ length: reelCount }, (_, c) =>
              Array(rowCounts[c] || 3).fill("-")
            );
            if (hit0.len > 0) {
              for (let c = 0; c < hit0.len; c++) grid[c][0] = hit0.sym;
            }
            if (hit1.len > 0) {
              for (let c = 0; c < hit1.len; c++) grid[c][1] = hit1.sym;
            }
            if (hit2.len > 0) {
              for (let c = 0; c < hit2.len; c++) grid[c][2] = hit2.sym;
            }

            const dummyPool = nonScatters.filter(
              (s) => s !== hit0.sym && s !== hit1.sym && s !== hit2.sym
            );
            let dIdx = 0;
            for (let c = 0; c < reelCount; c++) {
              for (let r = 0; r < (rowCounts[c] || 3); r++) {
                if (grid[c][r] === "-") {
                  grid[c][r] = dummyPool[dIdx % dummyPool.length] || "J";
                  dIdx++;
                }
              }
            }

            const wins = evaluateGrid(grid, currentPaytable, {
              gameType: "linegame_set2",
              paylines: linesToUse,
              effectiveBet: bet,
              goldFrames,
              jackpots,
            });

            const totalWin = wins.reduce((sum, w) => sum + w.totalWin, 0);
            return { grid, totalWin, wins, goldFrames, jackpots };
          };

          for (const interval of validIntervals) {
            const isNearWin = interval.min === 0 || interval.name.includes('接近大獎');
            const targetMin = interval.min * bet;
            const targetMax = interval.max !== null ? interval.max * bet : Infinity;
            const targetMid = interval.max !== null ? ((interval.min + interval.max) / 2) * bet : interval.min * 1.5 * bet;

            let bestCandidate: ReturnType<typeof evaluateCandidate> | null = null;
            let bestScore = -Infinity;

            // Phase 1: Pure symbol search (multi-row combinations, no gold frames, no jackpots)
            for (const hit1 of possibleRowHits) {
              for (const hit0 of possibleRowHits) {
                for (const hit2 of possibleRowHits) {
                  if (hit1.len === 0 && hit0.len === 0 && hit2.len === 0) continue;
                  const cand = evaluateCandidate(hit0, hit1, hit2);
                  const ratio = cand.totalWin / bet;

                  if (isNearWin) {
                    // We want ratio < 10, maximized as close to 10 as possible
                    if (cand.totalWin > 0 && ratio < 10) {
                      if (ratio > bestScore) {
                        bestScore = ratio;
                        bestCandidate = cand;
                      }
                    }
                  } else {
                    if (cand.totalWin >= targetMin && cand.totalWin < targetMax) {
                      const dist = -Math.abs(cand.totalWin - targetMid);
                      if (dist > bestScore) {
                        bestScore = dist;
                        bestCandidate = cand;
                      }
                    }
                  }
                }
              }
            }

            // Phase 2: If no pure line candidate was found (e.g. for higher intervals like EPIC WIN or SUPER MEGA WIN)
            if (!bestCandidate) {
              const testFrames: Record<string, number>[] = [
                {},
                { '1-1': 2 },
                { '1-1': 3 },
                { '1-1': 5 },
                { '1-1': 10 },
              ];
              const testJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>[] = [
                {},
                { '2-1': 'MINI' },
                { '2-1': 'MAJOR' },
                { '2-1': 'MEGA' },
              ];

              for (const jpHolder of testJackpots) {
                for (const gfHolder of testFrames) {
                  if (Object.keys(jpHolder).length === 0 && Object.keys(gfHolder).length === 0) continue;

                  for (const hit1 of possibleRowHits) {
                    for (const hit0 of possibleRowHits) {
                      if (hit1.len === 0 && hit0.len === 0) continue;
                      const cand = evaluateCandidate(hit0, hit1, { sym: '', len: 0 }, gfHolder, jpHolder);
                      const ratio = cand.totalWin / bet;

                      if (isNearWin) {
                        if (cand.totalWin > 0 && ratio < 10) {
                          if (ratio > bestScore) {
                            bestScore = ratio;
                            bestCandidate = cand;
                          }
                        }
                      } else {
                        if (cand.totalWin >= targetMin && cand.totalWin < targetMax) {
                          const dist = -Math.abs(cand.totalWin - targetMid);
                          if (dist > bestScore) {
                            bestScore = dist;
                            bestCandidate = cand;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Fallback safety
            if (!bestCandidate) {
              bestCandidate = evaluateCandidate({ sym: '', len: 0 }, { sym: nonScatters[0] || 'M1', len: 3 }, { sym: '', len: 0 });
            }

            const fullMathIds: string[] = [];
            const columnStrings: string[] = [];
            for (let c = 0; c < reelCount; c++) {
              const colArr: string[] = [];
              for (let r = 0; r < (rowCounts[c] || 3); r++) {
                const s = bestCandidate.grid[c][r];
                const mathId = mathIdMap[s] || s;
                fullMathIds.push(mathId);
                colArr.push(mathId);
              }
              columnStrings.push(colArr.join(","));
            }

            const classArr: number[] = [];
            Object.entries(bestCandidate.goldFrames).forEach(([key, val]) => {
              const [col, row] = key.split('-').map(Number);
              const poolIdx = multiplierToPoolIndex[val] ?? 0;
              classArr.push(col, row, poolIdx);
            });
            Object.entries(bestCandidate.jackpots).forEach(([key, val]) => {
              const [col, row] = key.split('-').map(Number);
              classArr.push(col, row, typeToId[val]);
            });
            const classStr = classArr.length > 0 ? `[${classArr.join(', ')}]` : '';

            const maxMatch = bestCandidate.wins.length > 0 ? Math.max(...bestCandidate.wins.map(w => w.matchCount)) : 3;

            newCombs.push({
              name: interval.name,
              length: maxMatch,
              wildCount: 0,
              rng: columnStrings,
              isInterfered: false,
              hasS1Drop: false,
              fullMathIds: fullMathIds,
              goldFrames: bestCandidate.goldFrames,
              jackpots: bestCandidate.jackpots,
              clovers: {},
              classStr: classStr,
            } as any);
          }

          setCombinations(newCombs);
          setIsSearching(false);
          return;
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
                goldFrames: {},
                jackpots: {},
                clovers: {},
                classStr: '',
              } as any);
            }
          });
        }
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
        for (let W = 0; W <= 1; W++) {
          for (let L = startLen; L <= reelCount; L++) {
            if (W === 1 && L < 2) continue; // WX 至少需要 L>=2（1個symbol+1個WX）
            const maxWild = Math.min(1, L - 1);
            if (W > maxWild) continue;
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
                W > 0  // requireGoldCascade 當需要 WX 時，透過消除黃金符號產生
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
          });
        }


      }

      setCombinations(newCombs);
      setIsSearching(false);
    }, 50);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedSymbol,
    multiplierIntervalsStr,
    isFreeGame
  ]);

  return { isSearching, combinations };
}
