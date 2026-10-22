/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MultiplierInterval } from '../../../types';
import { evaluateGrid, defaultPaylines } from '../../../utils/evaluation';
import { getTraits } from '../../registry';
import type { GeneratorCombination, GeneratorSearchParams, InstantGenerator, InstantGeneratorParams } from '../InstantGenerator';

/**
 * 線遊戲 MathID 即時產生器（奢華、諸神共用）
 * - 直接在第一條線路擺出「目標符號 × N (+ 百搭)」，其餘位置以不會連線的符號填滿
 * - traits.wyReels（諸神）：免遊百搭為 WY、Scatter 目標隔軸擺放、大獎區間可用 WY 整軸倍數
 */
function combos(params: InstantGeneratorParams): GeneratorCombination[] {
  const { selectedSymbol, reelCount, rowCounts, currentPaytable, gameType, specialSymbolConfig, customPaylines, isFreeGame, startLen } = params;
  const wyReels = !!getTraits(gameType).wyReels;
  const newCombs: GeneratorCombination[] = [];
  // --- LINE GAME SET 2 GENERATOR ---
  const excludeSymbols = [
    selectedSymbol,
    "WX",
    "WY",
    "WZ",
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
    const maxLen = (wyReels && isSelScatter) ? 3 : reelCount;
    for (let l = startLen; l <= maxLen; l++) {
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
      // Inject WY mathId based on W
      if (mathIdMap['W']) {
         mathIdMap['WY'] = mathIdMap['W'];
      }

    const isTargetWild = currentPaytable.some(p => p.symbolId === selectedSymbol && p.isWild) || ['WX', 'WY', 'WZ'].includes(selectedSymbol);
    // 百搭當目標時連線後一軸放 Scatter 擋住延伸（百搭不代替 Scatter），否則 WX WX WX WX M1 會被算成 M1 × 5
    const stopper = currentPaytable.find(p => p.isScatter && p.isEnabled !== false)?.symbolId;
    const paylinesForCheck = customPaylines && customPaylines.length > 0 ? customPaylines : defaultPaylines;

    targetLengths.forEach((len) => {
      // 百搭當目標時「+ WX」沒有意義（曾列出「WX × 3 + WX」）
      const maxWild = isTargetWild ? 0 : Math.min(1, len - 1);
      for (let W = 0; W <= maxWild; W++) {
        const line = linesToUse[0];
        const wildSymbol = (wyReels && isFreeGame) ? "WY" : "WX";
        const isGodsScatter = wyReels && isSelScatter;
        const safeNonScatters = nonScatters.filter((sym) => sym !== selectedSymbol);

        const buildFlatGrid = (attempt: number) => {
          const grid: string[][] = Array.from({ length: reelCount }, (_, c) =>
            Array(rowCounts[c] || 3).fill("-"),
          );

          // Place targets and wilds
          for (let c = 0; c < len; c++) {
            const targetCol = isGodsScatter ? c * 2 : c;
            if (targetCol >= reelCount) continue;
            if (W === 1 && c === 1) {
               grid[targetCol][line[targetCol]] = wildSymbol;
            } else {
               grid[targetCol][line[targetCol]] = selectedSymbol;
            }
          }
          if (isTargetWild && stopper && len < reelCount) {
            grid[len][line[len]] = stopper;
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

          // 1. Place special symbols randomly
          const emptySpots = flatGrid.filter((cell) => cell.val === "-");
          emptySpots.sort(() => Math.random() - 0.5);
          for (let i = 0; i < specialSymbolsToPlace.length; i++) {
             if (emptySpots.length > 0) {
                emptySpots[0].val = specialSymbolsToPlace[i];
                emptySpots.shift();
             }
          }

          // 2. 每軸用同一個填充符號（第一次依軸序，之後隨機），各軸不重複以減少跨軸連線
          const order = attempt === 0
            ? safeNonScatters.map((_, i) => i)
            : safeNonScatters.map((_, i) => i).sort(() => Math.random() - 0.5);
          for (let c = 0; c < reelCount; c++) {
             const dummySym = safeNonScatters[order[c % order.length]];
             const colEmptySpots = flatGrid.filter(cell => cell.c === c && cell.val === "-");
             for (const spot of colEmptySpots) {
                spot.val = dummySym;
             }
          }
          return flatGrid;
        };

        // 以遊戲評估驗證：只有目標本身中獎，沒有其他有贏分的連線（F05：曾未驗證，填充符號透過百搭另成 M2 × 3）
        const isClean = (flatGrid: { c: number; r: number; val: string }[]) => {
          if (isGodsScatter) return true;
          const symGrid = Array.from({ length: reelCount }, (_, c) => flatGrid.filter(cell => cell.c === c).map(cell => cell.val.split('_')[0]));
          const wins = evaluateGrid(symGrid, currentPaytable, { gameType, paylines: paylinesForCheck }, paylinesForCheck, true);
          const target = wins.find(w => w.symbolId === selectedSymbol && w.matchCount === len);
          if (!target) return false;
          // 諸神免遊的 WY 會整軸展開為百搭，經過該軸的其他線也會形成同一個目標連線（遊戲機制，不算干擾）
          const wyExpands = wyReels && isFreeGame && W === 1;
          return !wins.some(w => w !== target && w.payout > 0 && !(wyExpands && w.symbolId === selectedSymbol));
        };

        let flatGrid = buildFlatGrid(0);
        let interfered = !isClean(flatGrid);
        for (let attempt = 1; interfered && attempt < 300; attempt++) {
          const candidate = buildFlatGrid(attempt);
          if (isClean(candidate)) {
            flatGrid = candidate;
            interfered = false;
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
            const s = cell.val;
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
        const wildSymbolStr = (wyReels && isFreeGame) ? "WY" : "WX";
        if (isGodsScatter) {
          name = W === 0
            ? `${selectedSymbol} * ${len}`
            : `${selectedSymbol} * ${len - W} + ${wildSymbolStr}`;
        } else {
          name = W === 0
            ? `${selectedSymbol} * ${len}`
            : `${selectedSymbol} * ${len - W} + ${wildSymbolStr}`;
        }

        let defaultClassStr = '';
        if (wyReels && isFreeGame) {
           defaultClassStr = '[2,10,0]';
        }

        newCombs.push({
          name: name,
          length: len,
          wildCount: W,
          rng: columnStrings,
          isInterfered: interfered,
          fullMathIds: fullMathIds,
          goldFrames: {},
          jackpots: {},
          clovers: {},
          classStr: defaultClassStr,
        } as any);
      }
    });
  }
  return newCombs;
}

/** 大獎區間：組合多列連線，必要時加入金框 / Jackpot，找出落在區間內的盤面 */
function multiplierIntervals(params: GeneratorSearchParams, validIntervals: MultiplierInterval[]): GeneratorCombination[] {
  const { reelCount, rowCounts, currentPaytable, gameType, customPaylines, bet } = params;
  const wyReels = !!getTraits(gameType).wyReels;
  const newCombs: GeneratorCombination[] = [];
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

  const excludeSymbols = [
    "W", "W1", "W2", "WX", "WY", "WZ", "WILD", "B1", "B2", "S1", "S2", "NI",
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

      let wyConfigs: Record<number, {a: number, b: number, z: 0 | 1}> | undefined = undefined;
      if (wyReels) {
         // Inject WY based on hijacked goldFrames
         const keys = Object.keys(goldFrames);
         for (const key of keys) {
            if (key.startsWith('WY-')) {
               const col = parseInt(key.split('-')[1], 10); // 0-indexed column
               const mult = goldFrames[key];
               if (!wyConfigs) wyConfigs = {};
               wyConfigs[col] = { a: mult, b: mult, z: 0 };
               for (let r = 0; r < (rowCounts[col] || 3); r++) {
                 grid[col][r] = 'WY';
               }
            }
         }
      }

      const wins = evaluateGrid(grid, currentPaytable, {
        gameType: gameType,
        paylines: linesToUse,
        effectiveBet: bet,
        goldFrames,
        jackpots,
        wyConfigs,
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

  return newCombs;
}

export const lineMathIdGenerator: InstantGenerator = { combos, multiplierIntervals };
