import type {
  PaytableRule,
  GameType,
  MultiplierInterval,
} from "../../types";
import { getWinningPositions } from "../../utils/evaluation";
import type { AbstractGame } from "./AbstractGame";

export class RngSearchEngine {
  private gameInstance: AbstractGame;
  constructor(gameInstance: AbstractGame) {
    this.gameInstance = gameInstance;
  }

  async findRngForCombination(
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
    requireGoldCascade: boolean = false,
  ): Promise<{
    rng: number[] | null;
    isInterfered: boolean;
    hasS1Drop?: boolean;
    stripId?: number;
    allRngs?: number[][];
  }> {
    if (stripSets && Object.keys(stripSets).length > 0) {
      const stripIds = Object.keys(stripSets).map(Number);
      stripIds.sort(() => Math.random() - 0.5);
      let bestInterferred: {
        rng: number[] | null;
        isInterfered: boolean;
        hasS1Drop?: boolean;
        stripId?: number;
        allRngs?: number[][];
      } | null = null;

      for (const sid of stripIds) {
        const res = await this.findRngForCombination(
          targetSymbol,
          length,
          wildCount,
          stripSets[sid],
          rowCounts,
          currentPaytable,
          reelCount,
          gameType,
          topTrackerOther,
          customPaylines,
          isFreeGame,
          undefined,
          requireGoldCascade,
        );
        if (res.rng) {
          if (!res.isInterfered) {
            return { ...res, rng: [...res.rng, sid], stripId: sid };
          } else {
            if (!bestInterferred) {
              bestInterferred = {
                ...res,
                rng: res.rng ? [...res.rng, sid] : null,
                stripId: sid,
              };
            }
          }
        }
      }
      return bestInterferred || { rng: null, isInterfered: false };
    }

    const yieldIfNeeded = this.gameInstance.createTimeSlicer(16);
    const wildSymbolSet = new Set<string>();
    currentPaytable
      .filter((p) => p.isWild)
      .forEach((p) => wildSymbolSet.add(p.symbolId));
    wildSymbolSet.add("WILD");
    wildSymbolSet.add("W");
    wildSymbolSet.add("WX");
    for (const strip of currentStrips) {
      if (!strip) continue;
      for (const sym of strip) {
        if (sym === "WILD" || sym === "W" || sym === "WX")
          wildSymbolSet.add(sym);
      }
    }

    const MAX_RANDOM_ATTEMPTS = this.gameInstance.getMaxRandomAttempts();

    let testCount = 0;
    const candidateRng = Array(reelCount).fill(0);

    let minInterferenceCount = Infinity;
    let bestTargetPresence = Infinity;
    let bestCandidateRng: number[] | null = null;
    let bestAllRngs: number[][] | undefined = undefined;
    
    // Hill Climbing Optimization
    let hcBestRng: number[] | null = null;
    let hcBestMatchCount = 0;
    let hcAttempts = 0;
    const hcLockedReels = new Set<number>();
    const isTargetScatter = currentPaytable.some(p => p.symbolId === targetSymbol && p.isScatter);
    const isPositionDependent = gameType === 'linegame' || gameType === 'waygame' || gameType === 'waygame_elephant' || gameType === 'linegame_set2' || gameType === 'linegame_gods' || gameType === 'linegame_roma';

    const targetIndicesForReel: number[][] = [];
    const goldIndicesForReel: number[][] = [];
    for (let c = 0; c < reelCount; c++) {
      const targetValid = [];
      const goldValid = [];
      const strip = currentStrips[c];
      const rows = rowCounts[c];
      const len = strip.length;
      if (!strip || strip.length === 0) {
        targetIndicesForReel.push([]);
        goldIndicesForReel.push([]);
        continue;
      }
      for (let i = 0; i < len; i++) {
        let hasTarget = false;
        let hasGold = false;
        for (let r = 0; r < rows; r++) {
          const sym = strip[(i + r) % len];
          if (sym === targetSymbol || wildSymbolSet.has(sym)) {
            hasTarget = true;
          }
          if (targetSymbol === 'B1' && sym === 'B2') {
            hasTarget = true;
          }
          if ((targetSymbol === 'S1' || targetSymbol === 'S2' || targetSymbol === 'SCATTER') && (sym === 'S1' || sym === 'S2' || sym === 'SCATTER')) {
            hasTarget = true;
          }
          if (this.gameInstance.isGoldSymbol(sym)) {
            hasGold = true;
          }
        }
        if (hasTarget) targetValid.push(i);
        if (hasGold) goldValid.push(i);
      }
      targetIndicesForReel.push(targetValid);
      goldIndicesForReel.push(goldValid);
    }

    const possibleReelsCount = targetIndicesForReel.filter(v => v.length > 0).length;
    if (possibleReelsCount < length) {
      return { rng: null, isInterfered: false };
    }
    if (isPositionDependent) {
      for (let c = 0; c < length; c++) {
        if (targetIndicesForReel[c].length === 0) {
          return { rng: null, isInterfered: false };
        }
      }
    }

    let lastYieldTime = performance.now();

    while (testCount < MAX_RANDOM_ATTEMPTS) {
      testCount++;
      if (testCount % 50 === 0) {
        const now = performance.now();
        if (now - lastYieldTime > 15) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          lastYieldTime = performance.now();
        }
      }

      let skipDraw = false;
      let maxCurrentMatchCount = 0;
      let lockThreshold = hcBestMatchCount;
      if (requireGoldCascade && lockThreshold > 0 && lockThreshold < 3) {
        lockThreshold = 3;
      }

      let globalHasAnyGold = false;

      const isLineGame = (gameType === 'linegame' || gameType === 'linegame_roma' || gameType === 'linegame_set2' || gameType === 'linegame_gods') && !isTargetScatter && Boolean(customPaylines && customPaylines.length > 0);
      let targetPayline: number[] | null = null;
      let wildReelIndices: Set<number> | null = null;

      if (isLineGame && !requireGoldCascade && Math.random() < 0.90) {
        // 優先順序：優先嘗試最直觀的水平直線 (Line 1: [1,1,1,1,1], Line 2: [0,0,0,0,0], Line 3: [2,2,2,2,2])
        // 確保產出的連線在畫面上由左至右平直相連，最直觀清晰、最符合肉眼與常規線路驗證
        const straightLines = customPaylines!.filter(l => l.every(r => r === l[0]));
        if (straightLines.length > 0 && Math.random() < 0.85) {
          targetPayline = straightLines[Math.floor(Math.random() * straightLines.length)];
        } else {
          targetPayline = customPaylines![Math.floor(Math.random() * customPaylines!.length)];
        }

        if (wildCount > 0) {
          wildReelIndices = new Set();
          const availableReels: number[] = [];
          for (let rIdx = 0; rIdx < length; rIdx++) availableReels.push(rIdx);
          for (let w = 0; w < wildCount && availableReels.length > 0; w++) {
            const pickedIdx = Math.floor(Math.random() * availableReels.length);
            wildReelIndices.add(availableReels[pickedIdx]);
            availableReels.splice(pickedIdx, 1);
          }
        }
      }

      for (let c = 0; c < reelCount; c++) {
        let chosenIdx = 0;
        let len = currentStrips[c]?.length || 1;
        let rows = rowCounts[c] || 3;

        let isLocked = false;
        if (hcBestRng && hcAttempts < 500 && Math.random() < 0.92) {
          if (isTargetScatter) {
            isLocked = hcLockedReels.has(c);
          } else {
            isLocked = c < lockThreshold;
          }
        }

        if (isLocked) {
          chosenIdx = hcBestRng![c];
          candidateRng[c] = chosenIdx;
        } else if (targetPayline) {
          const targetRow = targetPayline[c] !== undefined ? targetPayline[c] : 0;
          if (c < length) {
            const isWildNeeded = Boolean(wildReelIndices && wildReelIndices.has(c));
            const validLineIndices: number[] = [];
            for (let i = 0; i < len; i++) {
              const sym = currentStrips[c][(i + targetRow) % len];
              if (isWildNeeded) {
                if (wildSymbolSet.has(sym)) validLineIndices.push(i);
              } else {
                if (sym === targetSymbol) validLineIndices.push(i);
              }
            }
            if (validLineIndices.length > 0) {
              chosenIdx = validLineIndices[Math.floor(Math.random() * validLineIndices.length)];
            } else {
              chosenIdx = Math.floor(Math.random() * len);
            }
          } else {
            const avoidTargetIndices: number[] = [];
            for (let i = 0; i < len; i++) {
              const sym = currentStrips[c][(i + targetRow) % len];
              if (sym !== targetSymbol && !wildSymbolSet.has(sym)) {
                avoidTargetIndices.push(i);
              }
            }
            if (avoidTargetIndices.length > 0) {
              chosenIdx = avoidTargetIndices[Math.floor(Math.random() * avoidTargetIndices.length)];
            } else {
              chosenIdx = Math.floor(Math.random() * len);
            }
          }
          candidateRng[c] = chosenIdx;
        } else {
          let useGoldList = false;
          let useTargetList = false;
          
          if (!hcBestRng) {
            if (requireGoldCascade && c < 3) {
              if (Math.random() < 0.85 && goldIndicesForReel[c].length > 0) {
                useGoldList = true;
              }
            } else if (!requireGoldCascade && c < length) {
              if (Math.random() < 0.60 && targetIndicesForReel[c].length > 0) {
                useTargetList = true;
              }
            }
          }
          
          if (useGoldList) {
            const valids = goldIndicesForReel[c];
            chosenIdx = valids[Math.floor(Math.random() * valids.length)];
          } else if (useTargetList) {
            const valids = targetIndicesForReel[c];
            chosenIdx = valids[Math.floor(Math.random() * valids.length)];
          } else {
            const maxIdx = len > rows + 2 ? len - rows : 0;
            if (maxIdx <= 2) {
              chosenIdx = Math.floor(Math.random() * len);
            } else {
              chosenIdx = Math.floor(Math.random() * (maxIdx - 2 + 1)) + 2;
            }
          }
          candidateRng[c] = chosenIdx;
        }

        let hasB1 = false;
        let hasTargetOrWild = false;
        for (let r = 0; r < rows; r++) {
          const sym = currentStrips[c][(chosenIdx + r) % len];
          if (gameType !== 'linegame_roma' && sym === "B1" && targetSymbol !== "B1") {
            hasB1 = true;
          }
          if ((sym === "S1" || sym === "S2") && targetSymbol !== "S1" && targetSymbol !== "S2" && targetSymbol !== "SCATTER") {
            hasB1 = true;
          }
          if (sym === targetSymbol || wildSymbolSet.has(sym)) {
            hasTargetOrWild = true;
          }
          if (requireGoldCascade && this.gameInstance.isGoldSymbol(sym)) {
            globalHasAnyGold = true;
          }
        }
        if (hasB1) {
          skipDraw = true;
          break;
        }
        
        const isPositionDependent = gameType === 'linegame' || gameType === 'waygame' || gameType === 'waygame_elephant' || gameType === 'linegame_set2' || gameType === 'linegame_gods' || gameType === 'linegame_roma';
        const isScatter = targetSymbol === 'S1' || targetSymbol === 'S2' || targetSymbol === 'SCATTER' || targetSymbol === 'B1' || targetSymbol === 'B2';
        
        if (c < length && !hasTargetOrWild && isPositionDependent && !isScatter && !requireGoldCascade) {
          skipDraw = true;
          break;
        }
      }
      
      if (!skipDraw && requireGoldCascade && !globalHasAnyGold) {
        skipDraw = true;
      }

      if (hcBestRng) {
        hcAttempts++;
        if (hcAttempts >= 200) {
          hcBestRng = null;
          hcBestMatchCount = 0;
          hcAttempts = 0;
          hcLockedReels.clear();
        }
      }

      if (skipDraw) continue;

      const initialGrid = this.gameInstance.getGridFromRng(
        candidateRng,
        currentStrips,
        rowCounts,
        reelCount,
      );
      const initialEvalGrid = this.gameInstance.getEvalGrid(
        initialGrid,
        gameType,
        length,
        topTrackerOther,
      );
      const initialWins = this.gameInstance.evaluate(
        initialEvalGrid,
        currentPaytable,
        { gameType, paylines: customPaylines },
        customPaylines,
        false,
      );

      if (requireGoldCascade) {
        const initialTargetWin = initialWins.find(
          (w) => w.symbolId === targetSymbol && w.payout > 0,
        );
        if (initialTargetWin) continue;

        let hasGoldWin = false;
        const winningCoordsMap = getWinningPositions(
          initialEvalGrid,
          initialWins,
          currentPaytable,
          gameType,
          undefined,
          customPaylines,
        );

        const eliminatedRowsMap: Record<number, number[]> = {};
        let initialTargetPresence = 0;
        let nonGoldWinCount = 0;

        for (const win of initialWins) {
          if (win.payout > 0) {
            let thisWinHasGold = false;
            const winPositions = getWinningPositions(
              initialEvalGrid,
              [win],
              currentPaytable,
              gameType,
              undefined,
              customPaylines,
            );
            for (let c = 0; c < reelCount; c++) {
              const rows = rowCounts[c] || 3;
              for (let r = 0; r < rows; r++) {
                if (
                  winPositions.has(`${c}-${r}`) &&
                  this.gameInstance.isGoldSymbol(initialEvalGrid[c][r])
                ) {
                  thisWinHasGold = true;
                }
              }
            }
            if (!thisWinHasGold) nonGoldWinCount++;
          }
        }

        for (let c = 0; c < reelCount; c++) {
          const rows = rowCounts[c] || 3;
          eliminatedRowsMap[c] = [];
          for (let r = 0; r < rows; r++) {
            if (winningCoordsMap.has(`${c}-${r}`)) {
              const winIndices = winningCoordsMap.get(`${c}-${r}`);
              if (winIndices && winIndices.some((idx) => idx !== 999)) {
                eliminatedRowsMap[c].push(r);
                if (this.gameInstance.isGoldSymbol(initialEvalGrid[c][r])) {
                  hasGoldWin = true;
                }
              }
            }
            if (initialEvalGrid[c][r] === targetSymbol) {
              initialTargetPresence++;
            }
          }
        }

        if (!hasGoldWin) continue;

        let nextGrid = initialGrid.map((col) => [...col]);
        let drawIndices = [...candidateRng].map((idx) => idx - 1);

        for (let c = 0; c < reelCount; c++) {
          const strip = currentStrips[c];
          const eliminatedRows = eliminatedRowsMap[c];
          if (eliminatedRows.length > 0) {
            this.gameInstance.applyCascade(
              nextGrid,
              c,
              eliminatedRows,
              strip,
              drawIndices,
              isFreeGame,
              gameType,
            );
          }
        }

        const nextEvalGrid = this.gameInstance.getEvalGrid(
          nextGrid,
          gameType,
          length,
          topTrackerOther,
        );
        const nextWins = this.gameInstance.evaluate(
          nextEvalGrid,
          currentPaytable,
          { gameType, paylines: customPaylines },
          customPaylines,
          true,
        );

        const targetWins = nextWins.filter((w) => w.symbolId === targetSymbol);
        const currentMatchCount = targetWins.length === 1 ? targetWins[0].matchCount : 0;
        
        let wildReelsValid = false;
        let positionValid = true;
        if (currentMatchCount > 0) {
            const targetWin = targetWins[0];
            if (targetWin.ways !== 1) positionValid = false;
            
            const nextWinningCoordsMap = getWinningPositions(
              nextEvalGrid,
              [targetWin],
              currentPaytable,
              gameType,
              undefined,
              customPaylines,
            );
            const wildReels = new Set<number>();
            let hasGoldInTargetWin = false;
            for (const key of nextWinningCoordsMap.keys()) {
              const [cStr, rStr] = key.split("-");
              const col = parseInt(cStr, 10);
              const row = parseInt(rStr, 10);
              const sym = nextEvalGrid[col][row];
              if (wildSymbolSet.has(sym)) {
                wildReels.add(col);
              } else if (this.gameInstance.isGoldSymbol(sym)) {
                hasGoldInTargetWin = true;
              }
            }
            if (!hasGoldInTargetWin && wildReels.size === wildCount) wildReelsValid = true;
        }

        const nextOtherWinsCount = nextWins.filter(
          (w) =>
            w.symbolId !== targetSymbol &&
            !wildSymbolSet.has(w.symbolId) &&
            w.payout > 0,
        ).length;

        const totalInterference = nonGoldWinCount + nextOtherWinsCount;

        if (totalInterference === 0 && initialTargetPresence === 0 && wildReelsValid && positionValid && currentMatchCount === length) {
          return { rng: [...candidateRng], isInterfered: false };
        }

        if (currentMatchCount >= hcBestMatchCount && currentMatchCount < length) {
          hcBestRng = [...candidateRng];
          hcBestMatchCount = currentMatchCount;
          hcAttempts = 0;
          hcLockedReels.clear();
          if (isTargetScatter) {
            for (let c = 0; c < reelCount; c++) {
              if (nextEvalGrid[c].some(s => s === targetSymbol || wildSymbolSet.has(s))) {
                hcLockedReels.add(c);
              }
            }
          }
        }

        if (wildReelsValid && positionValid && currentMatchCount === length) {
          if (
            totalInterference < minInterferenceCount ||
            (totalInterference === minInterferenceCount && initialTargetPresence < bestTargetPresence)
          ) {
            minInterferenceCount = totalInterference;
            bestTargetPresence = initialTargetPresence;
            bestCandidateRng = [...candidateRng];
          }
        }

      } else {
        const isLineGame = (gameType === 'linegame' || gameType === 'linegame_roma' || gameType === 'linegame_set2' || gameType === 'linegame_gods');
        const initialWinsWithZero = this.gameInstance.evaluate(
          initialEvalGrid,
          currentPaytable,
          { gameType, paylines: customPaylines },
          customPaylines,
          true,
        );

        let targetWin: any = null;
        let currentMatchCount = 0;
        let wildReelsValid = false;
        let positionValid = true;

        if (isLineGame) {
          const payingTargetWins = initialWins.filter((w) => w.symbolId === targetSymbol && w.payout > 0);
          if (payingTargetWins.length > 0) {
            const matched = payingTargetWins.find(w => w.matchCount === length);
            if (matched) {
              targetWin = matched;
              currentMatchCount = length;
            }
          } else {
            const targetMatches = initialWinsWithZero.filter((w) => w.symbolId === targetSymbol);
            const maxMatch = Math.max(0, ...targetMatches.map((w) => w.matchCount));
            if (maxMatch === length) {
              const matched = targetMatches.find(w => w.matchCount === length);
              if (matched) {
                targetWin = matched;
                currentMatchCount = length;
              }
            }
          }
        } else {
          const targetWins = initialWinsWithZero.filter((w) => w.symbolId === targetSymbol);
          if (targetWins.length === 1) {
            targetWin = targetWins[0];
            currentMatchCount = targetWin.matchCount;
          }
        }
        
        if (targetWin) {
            if (targetWin.ways !== 1) positionValid = false;
            
            const winningCoordsMap = getWinningPositions(
              initialEvalGrid,
              [targetWin],
              currentPaytable,
              gameType,
              undefined,
              customPaylines,
            );
            const wildReels = new Set<number>();
            let hasGoldInWin = false;
            for (const key of winningCoordsMap.keys()) {
              const [cStr, rStr] = key.split("-");
              const col = parseInt(cStr, 10);
              const row = parseInt(rStr, 10);
              const sym = initialEvalGrid[col][row];
              if (wildSymbolSet.has(sym)) {
                wildReels.add(col);
              }
              if (this.gameInstance.isGoldSymbol(sym)) {
                hasGoldInWin = true;
              }
            }
            if (!hasGoldInWin && wildReels.size === wildCount) wildReelsValid = true;
        }

        const payingTargetWinsCount = isLineGame ? initialWins.filter(w => w.symbolId === targetSymbol && w.payout > 0).length : 0;
        const extraTargetWinsCount = Math.max(0, payingTargetWinsCount - 1);
        const otherWinsCount = initialWins.filter(
          (w) =>
            w.symbolId !== targetSymbol &&
            !wildSymbolSet.has(w.symbolId) &&
            w.payout > 0,
        ).length + extraTargetWinsCount;

        if (otherWinsCount === 0 && wildReelsValid && positionValid && currentMatchCount === length) {
          if (this.gameInstance.validateCandidateRng) {
            const check = this.gameInstance.validateCandidateRng(
              candidateRng,
              initialEvalGrid,
              initialWins,
              currentPaytable,
              customPaylines,
              stripSets,
              isFreeGame
            );
            if (typeof check === 'boolean') {
              if (!check) continue;
              return { rng: [...candidateRng], isInterfered: false };
            } else if (check && !check.valid) {
              continue;
            } else if (check && check.valid) {
              return { rng: [...candidateRng], isInterfered: false, allRngs: check.allRngs };
            }
          }
          return { rng: [...candidateRng], isInterfered: false };
        }

        if (currentMatchCount > 0 && currentMatchCount >= hcBestMatchCount && currentMatchCount <= length) {
          // Allow hill climbing to lock reels even if there is interference, because
          // hcAttempts < 500 will eventually break out if it's permanently stuck.
          hcBestRng = [...candidateRng];
          hcBestMatchCount = currentMatchCount;
          hcAttempts = 0;
          hcLockedReels.clear();
          if (isTargetScatter) {
            for (let c = 0; c < reelCount; c++) {
              if (initialEvalGrid[c].some(s => s === targetSymbol || wildSymbolSet.has(s))) {
                hcLockedReels.add(c);
              }
            }
          }
        }

        if (wildReelsValid && positionValid && currentMatchCount === length) {
          let isValidCandidate = true;
          let candidateAllRngs: number[][] | undefined = undefined;
          if (this.gameInstance.validateCandidateRng) {
            const check = this.gameInstance.validateCandidateRng(
              candidateRng,
              initialEvalGrid,
              initialWins,
              currentPaytable,
              customPaylines,
              stripSets,
              isFreeGame
            );
            if (typeof check === 'boolean') {
              isValidCandidate = check;
            } else if (check) {
              isValidCandidate = check.valid;
              candidateAllRngs = check.allRngs;
            }
          }
          if (isValidCandidate && otherWinsCount < minInterferenceCount) {
            minInterferenceCount = otherWinsCount;
            bestCandidateRng = [...candidateRng];
            bestAllRngs = candidateAllRngs;
          }
        }
      }
    }

    if (bestCandidateRng) {
      return { rng: bestCandidateRng, isInterfered: (minInterferenceCount > 0), allRngs: bestAllRngs };
    }

    return { rng: null, isInterfered: false };
  }

  async findRngForCombos(
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame: boolean = false,
    _stripSets?: Record<string, string[][]>,
  ): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];
    const ATTEMPTS = isFreeGame ? 200000 : 400000;
    const yieldIfNeeded = this.gameInstance.createTimeSlicer(16);

    const candidateRng = new Array(reelCount).fill(0);
    let maxFoundCombo = 0;

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      // Early exit if we found a highly satisfactory combo to save time
      if ((!isFreeGame && maxFoundCombo >= 15) || (isFreeGame && maxFoundCombo >= 12)) {
        break;
      }
      
      if (attempt % 200 === 0) await yieldIfNeeded();

      let currentGrid: string[][] = new Array(reelCount);
      for (let c = 0; c < reelCount; c++) {
        const len = currentStrips[c]?.length || 1;
        const rows = rowCounts[c] || 3;
        const minIdx = 2;
        const maxIdx = len > rows + 2 ? len - rows : 0;
        let start = 0;
        if (maxIdx <= minIdx) {
          start = Math.floor(Math.random() * len);
        } else {
          start = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
        }
        candidateRng[c] = start;
        
        const s = currentStrips[c] || ["-"];
        currentGrid[c] = new Array(rows);
        for (let ri = 0; ri < rows; ri++) {
          currentGrid[c][ri] = s[(start + ri) % s.length];
        }
      }

      let drawIndices = [...candidateRng].map((idx) => idx - 1);
      let cascadeCount = 0;

      while (cascadeCount < 20) {
        const evalGrid = this.gameInstance.getEvalGridForCombos(currentGrid, topTrackerOther);

        const simWins = this.gameInstance.evaluate(
          evalGrid,
          currentPaytable,
          { gameType, paylines: customPaylines },
          customPaylines,
          false,
        );
        const cascadeWins = simWins.filter((w) => w.payout > 0);

        if (
          cascadeCount > 0 &&
          simWins.some((w) => w.symbolId === "B1" && w.matchCount >= 6)
        ) {
          cascadeCount = 0;
          break;
        }

        if (cascadeWins.length === 0) break;

        const winningCoordsMap = getWinningPositions(
          evalGrid,
          cascadeWins,
          currentPaytable,
          gameType,
          undefined,
          customPaylines,
        );
        let hasElimination = false;

        for (let c = 0; c < reelCount; c++) {
          const strip = currentStrips[c];
          const rows = rowCounts[c] || 3;
          const eliminatedRows: number[] = [];
          for (let r = 0; r < rows; r++) {
            if (winningCoordsMap.has(`${c}-${r}`)) {
              if (this.gameInstance.isSymbolUnremovable(currentGrid[c][r], isFreeGame)) {
                continue;
              }
              const winIndices = winningCoordsMap.get(`${c}-${r}`);
              if (winIndices && winIndices.some((idx) => idx !== 999)) {
                eliminatedRows.push(r);
              }
            }
          }

          if (eliminatedRows.length > 0) {
            hasElimination = true;
            this.gameInstance.applyCascade(
              currentGrid,
              c,
              eliminatedRows,
              strip,
              drawIndices,
              isFreeGame,
              gameType,
            );
          }
        }

        if (!hasElimination) break;
        cascadeCount++;
      }

      if (cascadeCount > 0) {
        if (cascadeCount > maxFoundCombo) {
          maxFoundCombo = cascadeCount;
        }
        while (results.length < cascadeCount) {
          results.push(null);
        }
        if (results[cascadeCount - 1] === null) {
          results[cascadeCount - 1] = [...candidateRng];
        }
      }
    }

    return results;
  }

  async findRngForMultiplierIntervals(
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
    _stripSets?: Record<string, string[][]>,
  ): Promise<Record<string, number[]>> {
    const results: Record<string, number[]> = {};
    const targets = new Set(intervals.map((i) => i.id));
    const hasCascade = this.gameInstance.hasCascadeFeature();
    const ATTEMPTS = 35000;
    const yieldIfNeeded = this.gameInstance.createTimeSlicer(16);

    const topSymbols = currentPaytable
      .filter(
        (p) =>
          !p.isScatter &&
          p.payouts &&
          Object.values(p.payouts).some((v) => v > 0),
      )
      .sort((a, b) => {
        const maxA = Math.max(...Object.values(a.payouts || {}));
        const maxB = Math.max(...Object.values(b.payouts || {}));
        return maxB - maxA;
      });

    const topSymbolStopsByRow: Record<number, number[]>[] = [];
    if (topSymbols.length > 0) {
      const highSymIds = new Set(
        [
          topSymbols[0].symbolId,
          topSymbols[1]?.symbolId,
          "WX",
          "WILD",
          "W",
        ].filter(Boolean),
      );
      for (let c = 0; c < reelCount; c++) {
        const strip = currentStrips[c] || [];
        const rows = rowCounts[c] || 3;
        const rowMap: Record<number, number[]> = {};
        for (let r = 0; r < rows; r++) rowMap[r] = [];
        for (let i = 0; i < strip.length; i++) {
          for (let r = 0; r < rows; r++) {
            if (highSymIds.has(strip[(i + r) % strip.length])) {
              rowMap[r].push(i);
            }
          }
        }
        topSymbolStopsByRow.push(rowMap);
      }
    }

    const candidateRng = new Array(reelCount).fill(0);

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (targets.size === 0) break;
      if (attempt % 200 === 0) await yieldIfNeeded();

      const remainingIntervals = intervals.filter((i) => targets.has(i.id));
      const onlyHighRemaining = remainingIntervals.every((i) => i.min >= 30);
      const useGuided =
        (attempt > 1000 && onlyHighRemaining) ||
        (attempt > 4000 && Math.random() < 0.6);
      const alignRow = Math.floor(Math.random() * 3);

      let currentGrid: string[][] = new Array(reelCount);
      for (let c = 0; c < reelCount; c++) {
        const len = currentStrips[c]?.length || 1;
        const rows = rowCounts[c] || 3;
        const minIdx = 2;
        const maxIdx = len > rows + 2 ? len - rows : 0;
        let start = 0;

        if (
          useGuided &&
          topSymbolStopsByRow[c] &&
          topSymbolStopsByRow[c][alignRow] &&
          topSymbolStopsByRow[c][alignRow].length > 0 &&
          Math.random() < 0.85
        ) {
          const list = topSymbolStopsByRow[c][alignRow];
          start = list[Math.floor(Math.random() * list.length)];
        } else if (maxIdx <= minIdx) {
          start = Math.floor(Math.random() * len);
        } else {
          start = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
        }
        candidateRng[c] = start;
        
        const s = currentStrips[c] || ["-"];
        currentGrid[c] = new Array(rows);
        for (let ri = 0; ri < rows; ri++) {
          currentGrid[c][ri] = s[(start + ri) % s.length];
        }
      }

      let totalPayout = 0;

      if (!hasCascade) {
        const simWins = this.gameInstance.evaluate(
          currentGrid,
          currentPaytable,
          { gameType, paylines: customPaylines, effectiveBet: bet },
          customPaylines,
          false,
        );
        for (let i = 0; i < simWins.length; i++) {
          totalPayout += simWins[i].totalWin || simWins[i].payout || 0;
        }
      } else {
        let drawIndices = [...candidateRng].map((idx) => idx - 1);
        let cascadeCount = 0;
        let b1Count = 0;

        while (cascadeCount < 20) {
          const evalGrid = this.gameInstance.getEvalGridForCombos(currentGrid, topTrackerOther);

          const simWins = this.gameInstance.evaluate(
            evalGrid,
            currentPaytable,
            { gameType, paylines: customPaylines, effectiveBet: bet },
            customPaylines,
            false,
          );
          const cascadeWins = simWins.filter((w) => w.payout > 0);

          let cascadePayout = 0;
          const cascadeMultiplier = this.gameInstance.getTumbleMultiplier(cascadeCount, isFreeGame);
          
          for (const w of cascadeWins)
            cascadePayout += w.totalWin || w.payout || 0;
          totalPayout += cascadePayout * cascadeMultiplier;

          const b1Win = simWins.find((w) => w.symbolId === "B1");
          if (b1Win) b1Count = Math.max(b1Count, b1Win.matchCount);

          if (cascadeWins.length === 0) break;

          const winningCoordsMap = getWinningPositions(
            evalGrid,
            cascadeWins,
            currentPaytable,
            gameType,
            undefined,
            customPaylines,
          );
          let hasElimination = false;

          for (let c = 0; c < reelCount; c++) {
            const strip = currentStrips[c];
            const rows = rowCounts[c] || 3;
            const eliminatedRows: number[] = [];
            for (let r = 0; r < rows; r++) {
              if (winningCoordsMap.has(`${c}-${r}`)) {
                if (this.gameInstance.isSymbolUnremovable(currentGrid[c][r], isFreeGame)) {
                  continue;
                }
                const winIndices = winningCoordsMap.get(`${c}-${r}`);
                if (winIndices && winIndices.some((idx) => idx !== 999)) {
                  eliminatedRows.push(r);
                }
              }
            }

            if (eliminatedRows.length > 0) {
              hasElimination = true;
              this.gameInstance.applyCascade(
                currentGrid,
                c,
                eliminatedRows,
                strip,
                drawIndices,
                isFreeGame,
                gameType,
              );
            }
          }

          if (!hasElimination) break;
          cascadeCount++;
        }

        if (!isFreeGame && b1Count >= 6) {
          continue;
        }
      }

      const multiplier = totalPayout / (bet || 1);

      for (const interval of intervals) {
        if (targets.has(interval.id)) {
          const maxVal = interval.max ?? Infinity;
          if (multiplier >= interval.min && multiplier < maxVal) {
            results[interval.id] = [...candidateRng];
            targets.delete(interval.id);
          }
        }
      }
    }

    return results;
  }
}
