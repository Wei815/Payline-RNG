/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GeneratorCombination, InstantGenerator, InstantGeneratorParams } from '../base/InstantGenerator';

/**
 * 決戰賽特2 MathID 即時產生器：
 * 依「個數」直接擺出 30 碼盤面 + 30 碼遞補，不需反向搜尋滾輪表。
 * 選擇「B1/B2」時產生各種 B1 / B2 組合。
 */
function combos(params: InstantGeneratorParams): GeneratorCombination[] {
  const { selectedSymbol, reelCount, rowCounts, currentPaytable, specialSymbolConfig, minWinCount, maxWinCount, startLen } = params;
  const newCombs: GeneratorCombination[] = [];
  // --- PAY ANYWHERE SET 2 GENERATOR ---
  // Target counts: 7 to 13
  let totalGridCells = 0;
  for (let c = 0; c < reelCount; c++) totalGridCells += rowCounts[c] || 3;
  // We generate 60 items: 30 for the initial grid, 30 for the drops
  const requiredTotal = totalGridCells * 2;

  // Get all available regular symbols (not target, not scatters) to fill the grid without wins
  const excludeSymbols =
    selectedSymbol === "B1/B2"
      ? ["B1", "B2", "WX", "WY", "WZ", "NI", "F1", "F2", "F3", "F4", "L1", "L2"]
      : [selectedSymbol, "WX", "WY", "WZ", "NI", "F1", "F2", "F3", "F4", "L1", "L2"];
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
      // Inject WY mathId based on W
      if (mathIdMap['W']) {
         mathIdMap['WY'] = mathIdMap['W'];
      }

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
      // Inject WY mathId based on W
      if (mathIdMap['W']) {
         mathIdMap['WY'] = mathIdMap['W'];
      }

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
          name: N < minWinCount
            ? `無贏分 (1)\n${selectedSymbol} 個數 ${N}`
            : `有贏分 (1)\n${selectedSymbol} 個數 ${N}`,
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
  return newCombs;
}

export const set2Generator: InstantGenerator = { combos };
