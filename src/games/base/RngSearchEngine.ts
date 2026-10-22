import type {
  PaytableRule,
  GameType,
  MultiplierInterval,
} from "../../types";
import { getWinningPositions, isEliminatedCell } from "../../utils/evaluation";
import type { AbstractGame } from "./AbstractGame";
import { getFamily, getTraits } from "../registry";
import { isInterferingWin } from "./searchRules";

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
    // 目標本身是百搭（WX × N）：連線上每一格都是百搭，不檢查百搭軸數（F03：曾因此一律找不到）
    const isTargetWild = wildSymbolSet.has(targetSymbol);
    const isPositionDependent = getTraits(gameType).searchPositionDependent;

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

    // 滾輪表沒有任何金框時（例如秦皇），+WX 不可能經由金框掉落形成，改走一般百搭搜尋
    if (requireGoldCascade && goldIndicesForReel.every(l => l.length === 0)) {
      requireGoldCascade = false;
    }

    // Pay Anywhere（含 Scatter）：目標是「全盤恰好 length 個」，與軸數無關，改用依個數分類的建構式搜尋
    if (getFamily(gameType) === 'payanywhere') {
      const rng = wildCount === 0
        ? this.constructivePayAnywhereSearch(targetSymbol, length, currentStrips, rowCounts, currentPaytable, reelCount, gameType, customPaylines, topTrackerOther)
        : null;
      return { rng, isInterfered: false };
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

      const isLineGame = getFamily(gameType) === 'line' && !isTargetScatter && Boolean(customPaylines && customPaylines.length > 0);
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
          if (this.gameInstance.blocksSearchDraw(sym, targetSymbol)) {
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
        
        const isPositionDependent = getTraits(gameType).searchPositionDependent;
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
            if (!hasGoldInTargetWin && (isTargetWild || wildReels.size === wildCount)) wildReelsValid = true;
        }

        // 百搭自己成線且有贏分也是干擾（F04：曾排除百搭，通用 Line「M4 × 2 + WX」盤面另有 WX × 2 在 4 條線各贏 10）
        const nextOtherWinsCount = nextWins.filter(
          (w) =>
            w.symbolId !== targetSymbol &&
            isInterferingWin(w, currentPaytable),
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
        const isLineGame = getFamily(gameType) === 'line';
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
        let duplicateTargetGroups = 0;

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
              const fullMatches = targetMatches.filter(w => w.matchCount === length);
              if (fullMatches.length > 0) {
                targetWin = fullMatches[0];
                currentMatchCount = length;
                // 0 賠率的目標（如 2 連線）：同一組格子落在多條線只算一組，不同格子各成一組則算多出的目標（F06）
                const cellGroups = new Set(fullMatches.map(w =>
                  [...getWinningPositions(initialEvalGrid, [w], currentPaytable, gameType, undefined, customPaylines).keys()].sort().join('|')));
                duplicateTargetGroups = cellGroups.size - 1;
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
            if (!hasGoldInWin && (isTargetWild || wildReels.size === wildCount)) wildReelsValid = true;
        }

        const payingTargetWinsCount = isLineGame ? initialWins.filter(w => w.symbolId === targetSymbol && w.payout > 0).length : 0;
        const extraTargetWinsCount = Math.max(0, payingTargetWinsCount - 1);
        // 百搭自己成線且有贏分也是干擾（F04）
        let otherWinsCount = initialWins.filter(
          (w) =>
            w.symbolId !== targetSymbol &&
            isInterferingWin(w, currentPaytable),
        ).length + extraTargetWinsCount + duplicateTargetGroups;

        // 有掉落的遊戲：目標消除後補上的盤面不可再有中獎，否則測案會多出選定目標以外的贏分
        if (otherWinsCount === 0 && wildReelsValid && positionValid && currentMatchCount === length &&
            !this.refillIsClean(candidateRng, currentStrips, rowCounts, reelCount, currentPaytable, gameType, customPaylines, isFreeGame, topTrackerOther)) {
          otherWinsCount = 1;
        }

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

    // Way 類隨機搜尋找不到乾淨解時，改用「依規則篩選停點」的建構式搜尋（取樣 + 決定性窮舉）
    if ((!bestCandidateRng || minInterferenceCount > 0) && getFamily(gameType) === 'way' && !isTargetScatter && !requireGoldCascade) {
      const constructed = this.constructiveWaySearch(
        targetSymbol, length, wildCount, currentStrips, rowCounts, currentPaytable, reelCount, gameType, wildSymbolSet, customPaylines, topTrackerOther,
      );
      if (constructed) return { rng: constructed, isInterfered: false };
    }

    if (bestCandidateRng) {
      return { rng: bestCandidateRng, isInterfered: (minInterferenceCount > 0), allRngs: bestAllRngs };
    }

    return { rng: null, isInterfered: false };
  }

  /**
   * Way 類單一路徑組合的建構式搜尋：
   * - 先把每軸停點分類：視窗內「恰好一個目標」、「恰好一個百搭」、「沒有目標也沒有百搭」
   * - 連線軸 (< length) 只從前兩類挑（百搭軸數 = wildCount），第 length 軸只從第三類挑，其餘軸任意
   * - 先隨機取樣，失敗再以決定性順序窮舉（有上限），讓「找不到」盡量代表真的不存在
   * 接受條件：恰好一筆目標 × length、ways = 1、百搭軸數正確、沒有任何其他有贏分的中獎（含百搭自成連線）
   */
  private constructiveWaySearch(
    targetSymbol: string,
    length: number,
    wildCount: number,
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    wildSymbolSet: Set<string>,
    customPaylines?: number[][],
    topTrackerOther?: string[],
  ): number[] | null {
    const SAMPLE_BUDGET = 3000;
    const ENUM_BUDGET = 20000;
    if (length > reelCount || wildCount > length) return null;

    const isT = (s: string) => s === targetSymbol;
    const isW = (s: string) => wildSymbolSet.has(s);
    // 優先使用不含 Bonus / Scatter 的停點；某一類在該軸完全沒有時才退而使用含 Bonus / Scatter 的停點
    // （例如秦皇多數 A 停點視窗內有 B1 / S1；只要最終盤面沒有任何其他贏分即可接受）
    const classes = Array.from({ length: reelCount }, (_, c) => {
      const strip = currentStrips[c] || [];
      const rows = rowCounts[c] || 3;
      const clean = { target: [] as number[], wild: [] as number[], none: [] as number[], any: [] as number[] };
      const blocked = { target: [] as number[], wild: [] as number[], none: [] as number[], any: [] as number[] };
      for (let i = 0; i < strip.length; i++) {
        const win = Array.from({ length: rows }, (_, r) => strip[(i + r) % strip.length]);
        const bucket = win.some(s => this.gameInstance.blocksSearchDraw(s, targetSymbol)) ? blocked : clean;
        bucket.any.push(i);
        const hits = win.filter(s => isT(s) || isW(s));
        if (hits.length === 0) bucket.none.push(i);
        else if (hits.length === 1) (isT(hits[0]) ? bucket.target : bucket.wild).push(i);
      }
      const prefer = (k: keyof typeof clean) => (clean[k].length > 0 ? clean[k] : blocked[k]);
      return { target: prefer('target'), wild: prefer('wild'), none: prefer('none'), any: prefer('any') };
    });

    const accept = (rng: number[]): boolean => {
      const grid = this.gameInstance.getGridFromRng(rng, currentStrips, rowCounts, reelCount);
      const evalGrid = this.gameInstance.getEvalGrid(grid, gameType, length, topTrackerOther);
      const wins = this.gameInstance.evaluate(evalGrid, currentPaytable, { gameType, paylines: customPaylines }, customPaylines, true);
      const targetWins = wins.filter(w => w.symbolId === targetSymbol);
      if (targetWins.length !== 1 || targetWins[0].matchCount !== length || targetWins[0].ways !== 1) return false;
      if (wins.some(w => w !== targetWins[0] && isInterferingWin(w, currentPaytable))) return false;
      const coords = getWinningPositions(evalGrid, [targetWins[0]], currentPaytable, gameType, undefined, customPaylines);
      const wildReels = new Set<number>();
      for (const key of coords.keys()) {
        const [c, r] = key.split('-').map(Number);
        if (isW(evalGrid[c]?.[r])) wildReels.add(c);
      }
      return (wildSymbolSet.has(targetSymbol) || wildReels.size === wildCount) &&
        this.refillIsClean(rng, currentStrips, rowCounts, reelCount, currentPaytable, gameType, customPaylines, false, topTrackerOther);
    };

    const listFor = (c: number, wildReels: Set<number>) =>
      c < length ? (wildReels.has(c) ? classes[c].wild : classes[c].target)
        : c === length ? classes[c].none : classes[c].any;

    // 1) 隨機取樣
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    for (let t = 0; t < SAMPLE_BUDGET; t++) {
      const wildReels = new Set<number>();
      const avail = Array.from({ length }, (_, i) => i);
      for (let k = 0; k < wildCount; k++) wildReels.add(avail.splice(Math.floor(Math.random() * avail.length), 1)[0]);
      const lists = Array.from({ length: reelCount }, (_, c) => listFor(c, wildReels));
      if (lists.some(l => l.length === 0)) continue;
      const rng = lists.map(pick);
      if (accept(rng)) return rng;
    }

    // 2) 決定性窮舉：逐一列舉百搭軸組合 × 連線軸 / 第 length 軸的停點乘積；其餘軸依序輪替
    const subsets: number[][] = [];
    const build = (start: number, acc: number[]) => {
      if (acc.length === wildCount) { subsets.push([...acc]); return; }
      for (let i = start; i < length; i++) build(i + 1, [...acc, i]);
    };
    build(0, []);
    let tried = 0;
    for (const subset of subsets) {
      const wildReels = new Set(subset);
      const lists = Array.from({ length: reelCount }, (_, c) => listFor(c, wildReels));
      if (lists.some(l => l.length === 0)) continue;
      const constrained = Math.min(reelCount, length + 1);
      const counter = Array(constrained).fill(0);
      for (;;) {
        if (tried++ >= ENUM_BUDGET) return null;
        const rng = lists.map((l, c) => (c < constrained ? l[counter[c]] : l[(tried * 7 + c * 13) % l.length]));
        if (accept(rng)) return rng;
        let c = constrained - 1;
        while (c >= 0) {
          counter[c]++;
          if (counter[c] < lists[c].length) break;
          counter[c] = 0;
          c--;
        }
        if (c < 0) break;
      }
    }
    return null;
  }

  /**
   * 有掉落的遊戲：消除第一盤所有中獎、依遊戲規則掉落一次後，補上的盤面是否沒有任何干擾中獎
   * 掉落模型與測案 Win= 相同（遊戲類別的 applyCascade、isSymbolUnremovable，停點往回抽）。
   * 遞補由腳本下一行決定的遊戲（羅馬，實作 findRefillRng）與 MathID 遊戲不在此檢查。
   */
  private refillIsClean(
    rng: number[],
    strips: string[][],
    rowCounts: number[],
    reelCount: number,
    paytable: PaytableRule[],
    gameType: GameType,
    paylines: number[][] | undefined,
    isFreeGame: boolean,
    topTrackerOther?: string[],
  ): boolean {
    const game = this.gameInstance as AbstractGame & { findRefillRng?: unknown };
    if (!game.hasCascadeFeature() || game.findRefillRng || getTraits(gameType).mathIdGenerator) return true;

    const grid = game.getGridFromRng(rng, strips, rowCounts, reelCount);
    const evalGrid = game.getEvalGridForCombos(grid, topTrackerOther);
    const wins = game.evaluate(evalGrid, paytable, { gameType, paylines }, paylines, false).filter(w => w.payout > 0);
    const coords = getWinningPositions(evalGrid, wins, paytable, gameType, undefined, paylines);
    const drawIndices = rng.map(r => r - 1);
    for (let c = 0; c < reelCount; c++) {
      const rows: number[] = [];
      for (let r = 0; r < (rowCounts[c] || 3); r++) {
        if (isEliminatedCell(coords, `${c}-${r}`) && !game.isSymbolUnremovable(grid[c][r], isFreeGame)) rows.push(r);
      }
      if (rows.length > 0) game.applyCascade(grid, c, rows, strips[c], drawIndices, isFreeGame, gameType);
    }
    const nextEval = game.getEvalGridForCombos(grid, topTrackerOther);
    return !game.evaluate(nextEval, paytable, { gameType, paylines }, paylines, false).some(w => isInterferingWin(w, paytable));
  }

  /**
   * Pay Anywhere 單一符號的建構式搜尋：
   * - 每軸停點依「視窗內目標個數」分組
   * - 隨機挑一組各軸個數（總和 = count），再從對應分組各挑一個停點
   * 接受條件：恰好一筆目標中獎且個數 = count、沒有任何其他有贏分的中獎
   */
  private constructivePayAnywhereSearch(
    targetSymbol: string,
    count: number,
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    customPaylines?: number[][],
    topTrackerOther?: string[],
  ): number[] | null {
    const SAMPLE_BUDGET = 5000;
    const byCount = Array.from({ length: reelCount }, (_, c) => {
      const strip = currentStrips[c] || [];
      const rows = rowCounts[c] || 3;
      const groups = new Map<number, number[]>();
      for (let i = 0; i < strip.length; i++) {
        let k = 0;
        for (let r = 0; r < rows; r++) if (strip[(i + r) % strip.length] === targetSymbol) k++;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(i);
      }
      return groups;
    });
    const counts = byCount.map(g => [...g.keys()]);
    const minRest = counts.map((_, c) => counts.slice(c).reduce((s, ks) => s + (ks.length ? Math.min(...ks) : Infinity), 0));
    const maxRest = counts.map((_, c) => counts.slice(c).reduce((s, ks) => s + (ks.length ? Math.max(...ks) : -Infinity), 0));
    if (!(minRest[0] <= count && count <= maxRest[0])) return null;

    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    for (let t = 0; t < SAMPLE_BUDGET; t++) {
      // 逐軸挑個數，保證剩下的軸仍湊得到總和
      const rng: number[] = [];
      let remaining = count;
      for (let c = 0; c < reelCount; c++) {
        const restMin = c + 1 < reelCount ? minRest[c + 1] : 0;
        const restMax = c + 1 < reelCount ? maxRest[c + 1] : 0;
        const options = counts[c].filter(k => remaining - k >= restMin && remaining - k <= restMax);
        if (options.length === 0) break;
        const k = pick(options);
        rng.push(pick(byCount[c].get(k)!));
        remaining -= k;
      }
      if (rng.length !== reelCount) continue;

      const grid = this.gameInstance.getGridFromRng(rng, currentStrips, rowCounts, reelCount);
      const evalGrid = this.gameInstance.getEvalGrid(grid, gameType, count, topTrackerOther);
      const wins = this.gameInstance.evaluate(evalGrid, currentPaytable, { gameType, paylines: customPaylines }, customPaylines, true);
      const targetWins = wins.filter(w => w.symbolId === targetSymbol);
      if (targetWins.length !== 1 || targetWins[0].matchCount !== count) continue;
      if (wins.some(w => w !== targetWins[0] && isInterferingWin(w, currentPaytable))) continue;
      if (!this.refillIsClean(rng, currentStrips, rowCounts, reelCount, currentPaytable, gameType, customPaylines, false, topTrackerOther)) continue;
      return rng;
    }
    return null;
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
