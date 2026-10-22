/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GeneratorCombination, GeneratorSearchParams, InstantGenerator, InstantGeneratorParams } from '../base/InstantGenerator';
import type { MultiplierInterval } from '../../types';
import { evaluateGrid } from '../../utils/evaluation';

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

/**
 * 大獎區間（F09：原本走滾輪表搜尋，決戰賽特2 沒有滾輪表所以一定找不到）
 * 直接組 30 碼盤面：1～3 種有賠率的符號各放 8～13 顆，其餘每種不超過 7 顆（不中獎），打亂位置後以遊戲評估算倍率
 */
function multiplierIntervals(params: GeneratorSearchParams, validIntervals: MultiplierInterval[]): GeneratorCombination[] {
  const { reelCount, rowCounts, currentPaytable, gameType, bet } = params;
  const MAX_ATTEMPTS = 4000;
  const totalCells = rowCounts.slice(0, reelCount).reduce((s, r) => s + (r || 3), 0);
  const excluded = new Set(['WX', 'WY', 'WZ', 'NI', 'F1', 'F2', 'F3', 'F4', 'L1', 'L2']);
  const regular = currentPaytable.filter(p => p.isEnabled !== false && !p.isScatter && !p.isWild && !excluded.has(p.symbolId));
  const paying = regular.filter(p => ['match3', 'match4', 'match5'].some(k => (p.payouts[k] ?? 0) > 0));
  const mathIdOf = (sym: string) => String(currentPaytable.find(p => p.symbolId === sym)?.mathId ?? sym).split(',')[0].trim();
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const newCombs: GeneratorCombination[] = [];
  if (paying.length === 0) return newCombs;

  for (const interval of validIntervals) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 1. 中獎符號與個數
      const cells: string[] = [];
      const winners = [...paying].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
      for (const w of winners) {
        const n = 8 + Math.floor(Math.random() * 6);
        if (cells.length + n > totalCells) break;
        for (let i = 0; i < n; i++) cells.push(w.symbolId);
      }
      // 2. 其餘格子：其他符號每種最多 7 顆
      const fillers = regular.map(p => p.symbolId).filter(sym => !winners.some(w => w.symbolId === sym));
      const used: Record<string, number> = {};
      while (cells.length < totalCells) {
        const options = fillers.filter(sym => (used[sym] ?? 0) < 7);
        if (options.length === 0) break;
        const sym = pick(options);
        used[sym] = (used[sym] ?? 0) + 1;
        cells.push(sym);
      }
      if (cells.length < totalCells) continue;
      cells.sort(() => Math.random() - 0.5);

      // 3. 以遊戲評估計算倍率（與測案 Win= 相同）
      const grid: string[][] = [];
      let k = 0;
      for (let c = 0; c < reelCount; c++) grid.push(cells.slice(k, k += rowCounts[c] || 3));
      const total = evaluateGrid(grid, currentPaytable, { gameType, paylines: [], effectiveBet: bet }, undefined, false)
        .reduce((s, w) => s + w.totalWin, 0);
      const multiplier = total / (bet || 1);
      if (multiplier < interval.min || (interval.max !== null && multiplier >= interval.max)) continue;

      const fullMathIds = cells.map(mathIdOf);
      const columnStrings = grid.map(col => col.map(mathIdOf).join(','));
      const dropMathIds = Array.from({ length: 50 }, () => mathIdOf(pick(fillers.length > 0 ? fillers : regular.map(p => p.symbolId))));
      newCombs.push({
        name: interval.name,
        length: 0,
        wildCount: 0,
        rng: columnStrings as any,
        isInterfered: false,
        fullMathIds,
        dropMathIds,
      } as any);
      break;
    }
  }
  return newCombs;
}

export const set2Generator: InstantGenerator = { combos, multiplierIntervals };
