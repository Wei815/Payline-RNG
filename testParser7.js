var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var excelParser_exports = {};
__export(excelParser_exports, {
  parseExcelData: () => parseExcelData
});
module.exports = __toCommonJS(excelParser_exports);
var xlsx = __toESM(require("xlsx"), 1);
async function parseExcelData(file) {
  const data = await file.arrayBuffer();
  const workbook = xlsx.read(data, { type: "array" });
  const result = {};
  const lineSheetName = workbook.SheetNames.find((s) => s.toLowerCase().replace(/\s/g, "") === "linetable");
  if (lineSheetName) {
    const lineData = xlsx.utils.sheet_to_json(workbook.Sheets[lineSheetName], { header: 1 });
    const paylines = [];
    let colOffset = 2;
    if (lineData.length > 1) {
      const headerRow = lineData[1] || lineData[0];
      if (headerRow[0] === "No." && headerRow[1] === "R1") {
        colOffset = 1;
      }
    }
    for (let i = 1; i < lineData.length; i++) {
      const row = lineData[i];
      if (row && row.length >= colOffset + 5 && row[0] !== void 0 && !isNaN(Number(row[0]))) {
        paylines.push([
          Number(row[colOffset]),
          Number(row[colOffset + 1]),
          Number(row[colOffset + 2]),
          Number(row[colOffset + 3]),
          Number(row[colOffset + 4])
        ]);
      }
    }
    if (paylines.length > 0) {
      result.paylines = paylines;
      if (file.name.includes("\u5962\u83EF")) {
        result.gameType = "linegame_set2";
      } else {
        result.gameType = "linegame";
      }
    }
  }
  function extractStrips(sheetName) {
    if (!workbook.Sheets[sheetName]) return void 0;
    const data2 = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    let headerRowIdx = -1;
    let r1ColIdx = -1;
    for (let i = 0; i < Math.min(20, data2.length); i++) {
      const row = data2[i];
      if (!row) continue;
      const colIdx = row.findIndex((cell) => String(cell).trim() === "R1");
      if (colIdx !== -1) {
        headerRowIdx = i;
        r1ColIdx = colIdx;
        break;
      }
    }
    if (headerRowIdx === -1 || r1ColIdx === -1) return void 0;
    const headerRow = data2[headerRowIdx];
    let reelCountFound = 0;
    while (String(headerRow[r1ColIdx + reelCountFound]).trim() === `R${reelCountFound + 1}`) {
      reelCountFound++;
    }
    const strips = Array.from({ length: reelCountFound }, () => []);
    for (let i = headerRowIdx + 1; i < data2.length; i++) {
      const row = data2[i];
      if (!row) continue;
      for (let c = 0; c < reelCountFound; c++) {
        const sym = row[r1ColIdx + c];
        if (sym !== void 0 && sym !== null && sym !== "") {
          strips[c].push(String(sym).trim());
        }
      }
    }
    const filtered = strips.filter((s) => s.length > 0);
    return filtered.length > 0 ? filtered : void 0;
  }
  result.strips = extractStrips("Base");
  result.freeStrips = extractStrips("Free");
  if (workbook.Sheets["Overview"]) {
    const overviewData = xlsx.utils.sheet_to_json(workbook.Sheets["Overview"], { header: 1 });
    for (let i = 0; i < overviewData.length; i++) {
      const row = overviewData[i];
      if (!row) continue;
      if (row[0] === "Coin" && result.coin === void 0) {
        if (overviewData[i + 1] && overviewData[i + 1][0] !== void 0) {
          result.coin = parseFloat(overviewData[i + 1][0]);
          result.bet = result.coin;
        }
      }
      if (row[0] === "Reel Size") {
        const sizes = [];
        for (let c = 1; c <= 5; c++) {
          if (row[c] !== void 0) sizes.push(parseInt(row[c]));
        }
        if (sizes.length > 0) {
          result.rowCounts = sizes;
          result.reelCount = sizes.length;
        }
      }
    }
    let ptStart = -1;
    for (let i = 0; i < overviewData.length; i++) {
      if (overviewData[i] && (overviewData[i][0] === "Base\\Free:" || String(overviewData[i][0]).includes("Base/Free") || String(overviewData[i][0]).includes("Base\\Free"))) {
        ptStart = i + 1;
        break;
      }
    }
    const paytableMap = {};
    const loopStart = ptStart !== -1 ? ptStart : 0;
    let hasExplicitMathId = false;
    for (let r = 0; r < overviewData.length; r++) {
      if (overviewData[r] && overviewData[r].some((c) => String(c).trim() === "SymbolID" || String(c).trim().replace(/\s/g, "") === "SymbolID")) {
        hasExplicitMathId = true;
        break;
      }
    }
    for (let i = loopStart; i < overviewData.length; i++) {
      if (!overviewData[i]) continue;
      const row = overviewData[i];
      let symbolIdCol = -1;
      for (let col = 0; col < row.length; col++) {
        if (String(row[col]).trim() === "SymbolID") {
          symbolIdCol = col;
          break;
        }
      }
      if (symbolIdCol !== -1) {
        const mathIdRow = overviewData[i + 1] && String(overviewData[i + 1][symbolIdCol]).trim() === "MathID" ? overviewData[i + 1] : null;
        for (let c = symbolIdCol + 1; c < row.length; c++) {
          if (row[c]) {
            const symId = String(row[c]).trim();
            let realSymId = symId;
            if (symId.includes("WW") || symId.includes("WX")) realSymId = "WX";
            else if (symId.includes("W1") || symId.includes("M1")) realSymId = "M1";
            else if (symId.includes("W2") || symId.includes("M2")) realSymId = "M2";
            else if (symId.includes("W3") || symId.includes("M3")) realSymId = "M3";
            else if (symId.includes("W4") || symId.includes("M4")) realSymId = "M4";
            else if (symId.includes("W5") || symId.includes("M5")) realSymId = "M5";
            else if (symId.includes("W6") || symId.includes("M6")) realSymId = "M6";
            else if (symId.includes("WA") || symId === "A") realSymId = "A";
            else if (symId.includes("WK") || symId === "K") realSymId = "K";
            else if (symId.includes("WQ") || symId === "Q") realSymId = "Q";
            else if (symId.includes("WJ") || symId === "J") realSymId = "J";
            else if (symId.includes("WT") || symId === "10" || symId === "TE") realSymId = "10";
            else if (symId.includes("WN") || symId === "9" || symId === "NI") realSymId = "9";
            else if (symId.includes("(B1)") || symId === "BONUS" || symId.includes("BOUNS")) realSymId = "B1";
            else if (symId.includes("(B2)") || symId === "SUPERBONUS") realSymId = "B2";
            else if (symId.includes("Scatter") || symId.includes("(S1)")) realSymId = "S1";
            let parsedMathId = void 0;
            if (mathIdRow && mathIdRow[c] !== void 0) {
              const parsed = parseInt(mathIdRow[c]);
              if (!isNaN(parsed)) parsedMathId = parsed;
            }
            const existing = paytableMap[realSymId];
            let newMathId = parsedMathId;
            if (existing && existing.mathId !== void 0 && parsedMathId !== void 0) {
              const existingIds = String(existing.mathId).split(",").map((s) => s.trim());
              if (!existingIds.includes(String(parsedMathId))) {
                newMathId = `${existing.mathId}, ${parsedMathId}`;
              } else {
                newMathId = existing.mathId;
              }
            }
            if (existing) {
              existing.mathId = newMathId;
              if (newMathId !== void 0) existing.isEnabled = true;
            } else {
              paytableMap[realSymId] = {
                symbolId: realSymId,
                name: realSymId === "WX" ? "Wild" : realSymId === "S1" ? "Scatter" : realSymId === "B1" ? "Bonus" : realSymId === "S2" ? "S2" : realSymId,
                payouts: {},
                isWild: realSymId === "WX",
                isScatter: realSymId === "SCATTER" || realSymId === "B1" || realSymId === "B2" || realSymId === "S1" || realSymId === "S2",
                mathId: newMathId,
                isEnabled: newMathId !== void 0
              };
            }
            for (let r = 1; r <= 25; r++) {
              if (!overviewData[i + r]) continue;
              const sharedMatchStr = String(overviewData[i + r][symbolIdCol] || "").trim();
              const isSelfContainedColumn = !overviewData[i][c + 1] || String(overviewData[i][c + 1]).trim() === "";
              if (!isSelfContainedColumn && sharedMatchStr === "SymbolID") break;
              if (sharedMatchStr === "MathID" || sharedMatchStr === "\u793A\u610F\u5716") continue;
              const sharedPayoutStr = String(overviewData[i + r][c] || "").trim();
              const selfMatchStr = String(overviewData[i + r][c] || "").trim();
              const selfPayoutStr = String(overviewData[i + r][c + 1] || "").trim();
              const parseMatchStr = (str) => {
                if (!str) return 0;
                if (str.includes(">=")) return parseInt(str.replace(/[^0-9]/g, ""));
                const num = parseInt(str);
                return !isNaN(num) && num >= 2 && num <= 30 ? num : 0;
              };
              const parsePayout = (str) => {
                if (!str || str === "--" || str === "-") return 0;
                const num = parseFloat(str);
                return isNaN(num) ? 0 : num;
              };
              const sharedMatch = parseMatchStr(sharedMatchStr);
              const selfMatch = isSelfContainedColumn ? parseMatchStr(selfMatchStr) : 0;
              const sharedPayout = parsePayout(sharedPayoutStr);
              const selfPayout = parsePayout(selfPayoutStr);
              let finalMatchStr = "";
              let finalPayout = 0;
              let finalMatchValue = 0;
              if (selfMatch > 0 && selfPayout > 0) {
                finalMatchStr = selfMatchStr;
                finalPayout = selfPayout;
                finalMatchValue = selfMatch;
              } else if (sharedMatch > 0 && sharedPayout > 0) {
                finalMatchStr = sharedMatchStr;
                finalPayout = sharedPayout;
                finalMatchValue = sharedMatch;
              } else if (sharedMatch > 0 && sharedPayoutStr === "--") {
                finalMatchStr = sharedMatchStr;
                finalPayout = 0;
                finalMatchValue = sharedMatch;
              }
              if (finalMatchValue > 0) {
                if (finalMatchStr.includes(">=")) {
                  for (let m = finalMatchValue; m <= 30; m++) {
                    paytableMap[realSymId].payouts[`match${m}`] = finalPayout;
                  }
                } else {
                  paytableMap[realSymId].payouts[`match${finalMatchValue}`] = finalPayout;
                }
              }
            }
          }
        }
      } else if (!hasExplicitMathId && (!row[0] || String(row[0]).trim() === "") && row.length > 1) {
        let headerStartCol = -1;
        for (let c = 1; c < row.length; c++) {
          if (row[c] && String(row[c]).trim() !== "") {
            headerStartCol = c;
            break;
          }
        }
        if (headerStartCol !== -1 && String(row[headerStartCol]).trim().replace(/\s/g, "") !== "SymbolID" && String(row[headerStartCol]).trim().replace(/\s/g, "") !== "MathID" && String(row[headerStartCol]).trim() !== "\u793A\u610F\u5716") {
          let nextRowHasPayouts = false;
          let payoutStartOffset = 1;
          for (let offset = 1; offset <= 5; offset++) {
            if (overviewData[i + offset]) {
              const firstCell = String(overviewData[i + offset][0] || overviewData[i + offset][headerStartCol - 1] || "").trim();
              if (firstCell && (!isNaN(parseInt(firstCell)) || firstCell.includes("+") || firstCell.includes("-"))) {
                nextRowHasPayouts = true;
                payoutStartOffset = offset;
                break;
              }
            }
          }
          if (nextRowHasPayouts) {
            let mathIdRow = null;
            for (let r = Math.max(0, i - 3); r <= i + 5; r++) {
              if (overviewData[r]) {
                const label = String(overviewData[r][0] || overviewData[r][headerStartCol - 1] || "").trim().replace(/\s/g, "");
                if (label === "MathID" || label === "SymbolID") {
                  mathIdRow = overviewData[r];
                  break;
                }
                if (overviewData[r][headerStartCol] === 0 || overviewData[r][headerStartCol] === "0") {
                  mathIdRow = overviewData[r];
                  break;
                }
              }
            }
            let lastValidPayoutRow = payoutStartOffset - 1;
            for (let c = headerStartCol; c < row.length; c++) {
              if (row[c]) {
                const symId = String(row[c]).trim();
                let realSymId = symId;
                if (symId === "WW") realSymId = "WX";
                if (symId === "W1") realSymId = "M1";
                if (symId === "W2") realSymId = "M2";
                if (symId === "W3") realSymId = "M3";
                if (symId === "W4") realSymId = "M4";
                if (symId === "W5") realSymId = "M5";
                if (symId === "W6") realSymId = "M6";
                if (symId === "WA") realSymId = "A";
                if (symId === "WK") realSymId = "K";
                if (symId === "WQ") realSymId = "Q";
                if (symId === "WJ") realSymId = "J";
                if (symId === "WT") realSymId = "TE";
                if (symId === "WN") realSymId = "NI";
                if (symId.includes("(B1)") || symId === "BONUS") realSymId = "B1";
                if (symId.includes("(B2)") || symId === "SUPERBONUS") realSymId = "B2";
                let parsedMathId = void 0;
                if (mathIdRow && mathIdRow[c] !== void 0) {
                  const parsed = parseInt(mathIdRow[c]);
                  if (!isNaN(parsed)) parsedMathId = parsed;
                } else if (!hasExplicitMathId) {
                  parsedMathId = c - 1;
                }
                const existing = paytableMap[realSymId];
                let newMathId = parsedMathId;
                if (existing && existing.mathId !== void 0 && parsedMathId !== void 0) {
                  const existingIds = String(existing.mathId).split(",").map((s) => s.trim());
                  if (!existingIds.includes(String(parsedMathId))) {
                    newMathId = `${existing.mathId}, ${parsedMathId}`;
                  } else {
                    newMathId = existing.mathId;
                  }
                }
                if (existing) {
                  existing.mathId = newMathId;
                  if (newMathId !== void 0) existing.isEnabled = true;
                } else {
                  paytableMap[realSymId] = {
                    symbolId: realSymId,
                    name: realSymId === "WX" ? "Wild" : realSymId === "SCATTER" ? "Scatter" : realSymId === "B1" ? "Bonus" : realSymId === "S1" ? "S1" : realSymId === "S2" ? "S2" : realSymId,
                    payouts: { match2: 0, match3: 0, match4: 0, match5: 0 },
                    isWild: realSymId === "WX",
                    isScatter: realSymId === "SCATTER" || realSymId === "B1" || realSymId === "B2" || realSymId === "S1" || realSymId === "S2",
                    mathId: newMathId,
                    isEnabled: newMathId !== void 0
                  };
                }
                for (let r = payoutStartOffset; r < payoutStartOffset + 5; r++) {
                  if (overviewData[i + r]) {
                    const matchCountStr = String(overviewData[i + r][0] || overviewData[i + r][headerStartCol - 1] || "").trim();
                    if (matchCountStr) {
                      let matchKey = null;
                      const matchCount = parseInt(matchCountStr);
                      if (!isNaN(matchCount) && matchCount >= 2 && matchCount <= 6 && !matchCountStr.includes("-") && !matchCountStr.includes("+")) {
                        matchKey = `match${matchCount}`;
                      } else if (matchCountStr.includes("8-9") || matchCountStr.includes("8 - 9")) {
                        matchKey = "match3";
                      } else if (matchCountStr.includes("10-11") || matchCountStr.includes("10 - 11")) {
                        matchKey = "match4";
                      } else if (matchCountStr.includes("12+") || matchCountStr.includes("12 +")) {
                        matchKey = "match5";
                      }
                      let payout = overviewData[i + r][c];
                      if (payout === "--" || payout === "-" || !payout) payout = 0;
                      else payout = parseFloat(payout) || 0;
                      if (matchKey && paytableMap[realSymId]) {
                        paytableMap[realSymId].payouts[matchKey] = payout;
                        if (r > lastValidPayoutRow) {
                          lastValidPayoutRow = r;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (lastValidPayoutRow >= payoutStartOffset) {
              i += lastValidPayoutRow;
            }
          }
        }
      }
    }
    result.paytable = Object.values(paytableMap);
  }
  if (!result.gameType) {
    if (file.name.includes("\u6C7A\u6230\u8CFD\u7279")) {
      result.gameType = "payanywhere_set2";
    } else if (file.name.includes("\u79E6\u7687")) {
      result.gameType = "waygame_qin";
    } else if (file.name.includes("\u5962\u83EF")) {
      result.gameType = "linegame_set2";
    } else if (!result.paylines || result.paylines.length === 0) {
      result.gameType = "payanywhere";
    } else {
      result.gameType = "waygame";
    }
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseExcelData
});
