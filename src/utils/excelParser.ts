import * as xlsx from 'xlsx';
import type { PaytableRule } from '../types';

export interface ExcelParsedData {
  gameType?: 'waygame' | 'linegame' | 'payanywhere' | 'linegame_set2' | 'payanywhere_set2' | 'waygame_qin' | 'waygame_elephant';
  coin?: number;
  bet?: number;
  paylines?: number[][];
  strips?: string[][];
  freeStrips?: string[][];
  stripSets?: string[][][];
  freeStripSets?: string[][][];
  paytable?: PaytableRule[];
  reelCount?: number;
  rowCounts?: number[];
}

export async function parseExcelData(file: File): Promise<ExcelParsedData> {
  const data = await file.arrayBuffer();
  const workbook = xlsx.read(data, { type: 'array' });
  const result: ExcelParsedData = {};

  // 1. Line Table
  const lineSheetName = workbook.SheetNames.find(s => s.toLowerCase().replace(/\s/g, '') === 'linetable');
  if (lineSheetName) {
    const lineData = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[lineSheetName], { header: 1 });
    const paylines: number[][] = [];
    
    let colOffset = 2; // Default for old format
    let headerRow = lineData[0];
    if (lineData.length > 1 && (lineData[1][0] === 'No.' || lineData[1][1] === 'R1')) {
      headerRow = lineData[1];
    }
    
    if (headerRow[0] === 'No.' && headerRow[1] === 'R1') {
      colOffset = 1;
    }

    let lineReelCount = 0;
    while (headerRow[colOffset + lineReelCount] && String(headerRow[colOffset + lineReelCount]).trim().toUpperCase() === `R${lineReelCount + 1}`) {
      lineReelCount++;
    }
    if (lineReelCount === 0) lineReelCount = 5; // fallback

    for (let i = 1; i < lineData.length; i++) {
      const row = lineData[i];
      if (row && row[0] !== undefined && String(row[0]).trim() !== '' && !isNaN(Number(row[0]))) {
        const line = [];
        for (let c = 0; c < lineReelCount; c++) {
          const val = row[colOffset + c];
          line.push(val !== undefined && String(val).trim() !== '' ? Number(val) : -1);
        }
        paylines.push(line);
      }
    }
    if (paylines.length > 0) {
      result.paylines = paylines;
      if (file.name.includes('奢華')) {
        result.gameType = 'linegame_set2';
      } else {
        result.gameType = 'linegame'; // if there's a line table, it's likely a linegame
      }
    }
  }

  // 2. Base and Free Strips
  function extractStrips(sheetName: string): string[][][] | undefined {
    if (!workbook.Sheets[sheetName]) return undefined;
    const data = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 });
    
    // Find header row with 'R1'
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      const colIdx = row.findIndex((cell: any) => String(cell).trim() === 'R1');
      if (colIdx !== -1) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) return undefined;
    
    const headerRow = data[headerRowIdx];
    
    // Find all 'R1' columns in the header row
    const r1ColIndices: number[] = [];
    for (let i = 0; i < headerRow.length; i++) {
      if (String(headerRow[i]).trim() === 'R1') {
        r1ColIndices.push(i);
      }
    }
    
    const allStrips: string[][][] = [];
    
    for (const r1ColIdx of r1ColIndices) {
      // Determine how many reels by checking R1, R2, R3...
      let reelCountFound = 0;
      while (String(headerRow[r1ColIdx + reelCountFound]).trim() === `R${reelCountFound + 1}`) {
        reelCountFound++;
      }

      const strips: string[][] = Array.from({ length: reelCountFound }, () => []);
      
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        for (let c = 0; c < reelCountFound; c++) {
          const sym = row[r1ColIdx + c];
          if (sym !== undefined && sym !== null && sym !== '') {
            strips[c].push(String(sym).trim());
          }
        }
      }
      
      const filtered = strips.filter(s => s.length > 0);
      if (filtered.length > 0) {
        allStrips.push(filtered);
      }
    }
    
    return allStrips.length > 0 ? allStrips : undefined;
  }
  
  const baseStripSets = extractStrips('Base');
  const freeStripSets = extractStrips('Free');
  
  if (baseStripSets) {
    result.stripSets = baseStripSets;
    result.strips = baseStripSets[0];
  }
  
  if (freeStripSets) {
    result.freeStripSets = freeStripSets;
    result.freeStrips = freeStripSets[0];
  }

  // 3. Overview (Coin, Line, Reel sizes, Paytable)
  if (workbook.Sheets['Overview']) {
    const overviewData = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets['Overview'], { header: 1 });
    
    for (let i = 0; i < overviewData.length; i++) {
      const row = overviewData[i];
      if (!row) continue;
      
      const coinIdx = row.findIndex((cell: any) => String(cell).trim() === 'Coin');
      if (coinIdx !== -1 && result.coin === undefined) {
        if (overviewData[i+1] && overviewData[i+1][coinIdx] !== undefined) {
          result.coin = parseFloat(overviewData[i+1][coinIdx]);
          result.bet = result.coin;
        }
      }

      const wayIdx = row.findIndex((cell: any) => String(cell).trim() === 'Way');
      if (wayIdx !== -1 && result.gameType === undefined) {
        if (overviewData[i+1] && overviewData[i+1][wayIdx] !== undefined) {
           const wayStr = String(overviewData[i+1][wayIdx]);
           if (wayStr.includes('4096') || parseInt(wayStr) === 4096) {
             result.gameType = 'waygame_qin';
           } else if (parseInt(wayStr) > 0) {
             if (file.name.includes('家') || file.name.includes('象')) {
               result.gameType = 'waygame_elephant';
             } else {
               result.gameType = 'waygame';
             }
           }
        }
      }
      
      const reelSizeIdx = row.findIndex((cell: any) => String(cell).trim() === 'Reel Size');
      if (reelSizeIdx !== -1) {
        const sizes: number[] = [];
        for (let c = reelSizeIdx + 1; c < row.length; c++) {
          if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
            sizes.push(parseInt(row[c]));
          }
        }
        if (sizes.length > 0) {
          result.rowCounts = sizes;
          result.reelCount = sizes.length;
        }
      }
    }

    let ptStart = -1;
    for (let i = 0; i < overviewData.length; i++) {
      if (overviewData[i] && (overviewData[i][0] === 'Base\\Free:' || String(overviewData[i][0]).includes('Base/Free') || String(overviewData[i][0]).includes('Base\\Free'))) {
        ptStart = i + 1;
        break;
      }
    }

    const paytableMap: Record<string, PaytableRule> = {};
    const loopStart = ptStart !== -1 ? ptStart : 0;
    
    // Pre-scan to see if this file has explicit SymbolID rows
    let hasExplicitMathId = false;
    for (let r = 0; r < overviewData.length; r++) {
      if (overviewData[r] && overviewData[r].some((c: any) => String(c).trim() === 'SymbolID' || String(c).trim().replace(/\s/g, '') === 'SymbolID')) {
        hasExplicitMathId = true;
        break;
      }
    }

    for (let i = loopStart; i < overviewData.length; i++) {
      if (!overviewData[i]) continue;
      const row = overviewData[i];

        let symbolIdCol = -1;
        for (let col = 0; col < row.length; col++) {
          if (String(row[col]).trim() === 'SymbolID') {
            symbolIdCol = col;
            break;
          }
        }

        // 1. New Format: Explicit SymbolID and MathID rows
        if (symbolIdCol !== -1) {
          const mathIdRow = overviewData[i+1] && String(overviewData[i+1][symbolIdCol]).trim() === 'MathID' ? overviewData[i+1] : null;
          
          for (let c = symbolIdCol + 1; c < row.length; c++) {
            if (row[c]) {
              const symId = String(row[c]).trim();
              
              // Ignore stray numbers (like match counts/payouts from adjacent tables)
              if (/^\d+$/.test(symId) && symId !== '10' && symId !== '9') {
                continue;
              }

              let realSymId = symId;
              if (symId.includes('WW') || symId.includes('WX')) realSymId = 'WX';
              else if (symId.includes('W1') || symId.includes('M1')) realSymId = 'M1';
              else if (symId.includes('W2') || symId.includes('M2')) realSymId = 'M2';
              else if (symId.includes('W3') || symId.includes('M3')) realSymId = 'M3';
              else if (symId.includes('W4') || symId.includes('M4')) realSymId = 'M4';
              else if (symId.includes('W5') || symId.includes('M5')) realSymId = 'M5';
              else if (symId.includes('W6') || symId.includes('M6')) realSymId = 'M6';
              else if (symId.includes('WA') || symId === 'A') realSymId = 'A';
              else if (symId.includes('WK') || symId === 'K') realSymId = 'K';
              else if (symId.includes('WQ') || symId === 'Q') realSymId = 'Q';
              else if (symId.includes('WJ') || symId === 'J') realSymId = 'J';
              else if (symId.includes('WT') || symId === '10' || symId === 'TE') realSymId = '10';
              else if (symId.includes('WN') || symId === '9' || symId === 'NI') realSymId = '9';
              else if (symId.includes('(B1)') || symId === 'BONUS' || symId.includes('BOUNS')) realSymId = 'B1';
              else if (symId.includes('(B2)') || symId === 'SUPERBONUS') realSymId = 'B2';
              else if (symId.includes('Scatter') || symId.includes('(S1)')) realSymId = 'S1';

              let parsedMathId: string | number | undefined = undefined;
              if (mathIdRow && mathIdRow[c] !== undefined) {
                const parsed = parseInt(mathIdRow[c]);
                if (!isNaN(parsed)) parsedMathId = parsed;
              }

              const existing = paytableMap[realSymId];
              let newMathId: string | number | undefined = parsedMathId;
              if (existing && existing.mathId !== undefined && parsedMathId !== undefined) {
                const existingIds = String(existing.mathId).split(',').map(s => s.trim());
                if (!existingIds.includes(String(parsedMathId))) {
                  newMathId = `${existing.mathId}, ${parsedMathId}`;
                } else {
                  newMathId = existing.mathId;
                }
              }

              if (existing) {
                existing.mathId = newMathId;
                if (newMathId !== undefined) existing.isEnabled = true;
              } else {
                paytableMap[realSymId] = {
                  symbolId: realSymId,
                  name: realSymId === 'WX' ? 'Wild' : realSymId === 'S1' ? 'Scatter' : realSymId === 'B1' ? 'Bonus' : realSymId === 'S2' ? 'S2' : realSymId,
                  payouts: {},
                  isWild: realSymId === 'WX',
                  isScatter: realSymId === 'SCATTER' || realSymId === 'S1' || realSymId === 'S2',
                  mathId: newMathId,
                  isEnabled: newMathId !== undefined
                };
              }

              // Parse payouts downwards
              for (let r = 1; r <= 25; r++) {
                if (!overviewData[i+r]) continue;
                
                const sharedMatchStr = String(overviewData[i+r][symbolIdCol] || '').trim();
                
                let hasSharedMatchCount = false;
                for (let rScan = 1; rScan <= 20; rScan++) {
                  if (!overviewData[i+rScan]) continue;
                  const leftLabel = String(overviewData[i+rScan][symbolIdCol] || '').trim();
                  if (leftLabel === 'SymbolID') break;
                  if (leftLabel === 'MathID' || leftLabel === '示意圖') continue;
                  const parseLeft = parseInt(leftLabel.replace(/[^0-9]/g, ''));
                  if (!isNaN(parseLeft) && parseLeft >= 2 && parseLeft <= 30) {
                    hasSharedMatchCount = true;
                    break;
                  }
                }

                let isSelfContainedColumn = false;
                if (!hasSharedMatchCount) {
                  for (let rScan = 1; rScan <= 20; rScan++) {
                    if (!overviewData[i+rScan]) continue;
                    const leftLabel = String(overviewData[i+rScan][symbolIdCol] || '').trim();
                    if (leftLabel === 'SymbolID') break;
                    if (leftLabel === 'MathID' || leftLabel === '示意圖') continue;
                    
                    const valC = String(overviewData[i+rScan][c] || '').trim();
                    const valCPlus1 = String(overviewData[i+rScan][c+1] || '').trim();
                    
                    if (valC !== '' && valC !== '--' && valC !== '-') {
                      const matchNum = parseInt(valC.replace(/[^0-9]/g, ''));
                      if (!isNaN(matchNum) && matchNum >= 2 && matchNum <= 30) {
                        if (valCPlus1 !== '' && valCPlus1 !== '--' && valCPlus1 !== '-' && !isNaN(parseFloat(valCPlus1))) {
                          isSelfContainedColumn = true;
                          break;
                        }
                      }
                    }
                    
                    if (valC === '--' || valC === '-' || (!isNaN(parseFloat(valC)) && parseFloat(valC) > 30)) {
                      break;
                    }
                  }
                }

                if (!isSelfContainedColumn && sharedMatchStr === 'SymbolID') break;
                if (!isSelfContainedColumn && (sharedMatchStr === 'MathID' || sharedMatchStr === '示意圖')) continue;
                
                const sharedPayoutStr = String(overviewData[i+r][c] || '').trim();
                
                const selfMatchStr = String(overviewData[i+r][c] || '').trim();
                const selfPayoutStr = String(overviewData[i+r][c+1] || '').trim();

                const parseMatchStr = (str: string) => {
                  if (!str) return 0;
                  if (str.includes('>=')) return parseInt(str.replace(/[^0-9]/g, ''));
                  const num = parseInt(str);
                  return (!isNaN(num) && num >= 2 && num <= 30) ? num : 0;
                };

                const parsePayout = (str: string) => {
                  if (!str || str === '--' || str === '-') return 0;
                  const num = parseFloat(str);
                  return isNaN(num) ? 0 : num;
                };


                const sharedMatch = parseMatchStr(sharedMatchStr);
                const selfMatch = isSelfContainedColumn ? parseMatchStr(selfMatchStr) : 0;
                const sharedPayout = parsePayout(sharedPayoutStr);
                const selfPayout = parsePayout(selfPayoutStr);

                let finalMatchStr = '';
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
                } else if (sharedMatch > 0 && sharedPayoutStr === '--') {
                  // Special case for zero payouts with '--'
                  finalMatchStr = sharedMatchStr;
                  finalPayout = 0;
                  finalMatchValue = sharedMatch;
                }

                if (finalMatchValue > 0) {
                  if (finalMatchStr.includes('>=')) {
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
        }
        // 2. Old Format: The row right after Base\Free: or multiple blocks of payouts
        else if ((!row[0] || String(row[0]).trim() === '') && row.length > 1) {
          // Find the first column that has a header symbol
          let headerStartCol = -1;
          for (let c = 1; c < row.length; c++) {
            if (row[c] && String(row[c]).trim() !== '') {
              headerStartCol = c;
              break;
            }
          }

          if (headerStartCol !== -1 && String(row[headerStartCol]).trim().replace(/\s/g, '') !== 'SymbolID' && String(row[headerStartCol]).trim().replace(/\s/g, '') !== 'MathID' && String(row[headerStartCol]).trim() !== '示意圖') {
            // Verify it's a header row by checking if any of the next 5 rows have payouts
            let nextRowHasPayouts = false;
            let payoutStartOffset = 1;
            for (let offset = 1; offset <= 5; offset++) {
              if (overviewData[i+offset]) {
                const firstCell = String(overviewData[i+offset][0] || overviewData[i+offset][headerStartCol - 1] || '').trim();
                if (firstCell && (!isNaN(parseInt(firstCell)) || firstCell.includes('+') || firstCell.includes('-'))) {
                  nextRowHasPayouts = true;
                  payoutStartOffset = offset;
                  break;
                }
              }
            }

            if (nextRowHasPayouts) {
              let mathIdRow: any[] | null = null;
              for (let r = Math.max(0, i - 3); r <= i + 5; r++) {
                if (overviewData[r]) {
                  const label = String(overviewData[r][0] || overviewData[r][headerStartCol - 1] || '').trim().replace(/\s/g, '');
                  if (label === 'MathID' || label === 'SymbolID') {
                    mathIdRow = overviewData[r];
                    break;
                  }
                  if (overviewData[r][headerStartCol] === 0 || overviewData[r][headerStartCol] === '0') {
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
                if (symId === 'WW') realSymId = 'WX';
                if (symId === 'W1') realSymId = 'M1';
                if (symId === 'W2') realSymId = 'M2';
                if (symId === 'W3') realSymId = 'M3';
                if (symId === 'W4') realSymId = 'M4';
                if (symId === 'W5') realSymId = 'M5';
                if (symId === 'W6') realSymId = 'M6';
                if (symId === 'WA') realSymId = 'A';
                if (symId === 'WK') realSymId = 'K';
                if (symId === 'WQ') realSymId = 'Q';
                if (symId === 'WJ') realSymId = 'J';
                if (symId === 'WT') realSymId = 'TE';
                if (symId === 'WN') realSymId = 'NI';
                if (symId.includes('(B1)') || symId === 'BONUS') realSymId = 'B1';
                if (symId.includes('(B2)') || symId === 'SUPERBONUS') realSymId = 'B2';

                let parsedMathId: string | number | undefined = undefined;
                if (mathIdRow && mathIdRow[c] !== undefined) {
                  const parsed = parseInt(mathIdRow[c]);
                  if (!isNaN(parsed)) parsedMathId = parsed;
                } else if (!hasExplicitMathId) {
                  parsedMathId = c - 1;
                }

                const existing = paytableMap[realSymId];
                let newMathId: string | number | undefined = parsedMathId;
                if (existing && existing.mathId !== undefined && parsedMathId !== undefined) {
                  const existingIds = String(existing.mathId).split(',').map(s => s.trim());
                  if (!existingIds.includes(String(parsedMathId))) {
                    newMathId = `${existing.mathId}, ${parsedMathId}`;
                  } else {
                    newMathId = existing.mathId;
                  }
                }

                if (existing) {
                  existing.mathId = newMathId;
                  if (newMathId !== undefined) existing.isEnabled = true;
                } else {
                  paytableMap[realSymId] = {
                    symbolId: realSymId,
                    name: realSymId === 'WX' ? 'Wild' : realSymId === 'SCATTER' ? 'Scatter' : realSymId === 'B1' ? 'Bonus' : realSymId === 'S1' ? 'S1' : realSymId === 'S2' ? 'S2' : realSymId,
                    payouts: { match2: 0, match3: 0, match4: 0, match5: 0 },
                    isWild: realSymId === 'WX',
                    isScatter: realSymId === 'SCATTER' || realSymId === 'S1' || realSymId === 'S2',
                    mathId: newMathId,
                    isEnabled: newMathId !== undefined
                  };
                }

                for (let r = payoutStartOffset; r < payoutStartOffset + 8; r++) {
                  if (overviewData[i+r]) {
                    const matchCountStr = String(overviewData[i+r][0] || overviewData[i+r][headerStartCol - 1] || '').trim();
                    
                    // Stop if we hit another header row
                    if (!matchCountStr.includes('+') && !matchCountStr.includes('-') && isNaN(parseInt(matchCountStr))) {
                      break;
                    }

                    if (matchCountStr) {
                      let matchKey: keyof PaytableRule['payouts'] | null = null;
                      
                      // 1. Direct numbers and >= patterns (2, 3... 20, >=10)
                      let matchCount = parseInt(matchCountStr.replace(/[^0-9]/g, ''));
                      if (!isNaN(matchCount) && matchCount >= 2 && matchCount <= 30 && !matchCountStr.includes('-')) {
                        matchKey = `match${matchCount}` as keyof PaytableRule['payouts'];
                      }
                      // 2. Ranges for payanywhere_set2
                      else if (matchCountStr.includes('8-9') || matchCountStr.includes('8 - 9')) {
                        matchKey = 'match3';
                      }
                      else if (matchCountStr.includes('10-11') || matchCountStr.includes('10 - 11')) {
                        matchKey = 'match4';
                      }
                      else if (matchCountStr.includes('12+') || matchCountStr.includes('12 +')) {
                        matchKey = 'match5';
                      }

                      let payout = overviewData[i+r][c];
                      if (payout === '--' || payout === '-' || !payout) payout = 0;
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
      result.paytable = Object.values(paytableMap).filter(rule => {
        if (rule.isWild || rule.isScatter) return true;
        return Object.keys(rule.payouts).length > 0;
      });
  }

  if (!result.reelCount) {
    if (result.rowCounts && result.rowCounts.length > 0) {
      result.reelCount = result.rowCounts.length;
    } else if (result.strips && result.strips.length > 0) {
      result.reelCount = result.strips.length;
    }
  }

  if (!result.gameType) {
    if (file.name.includes('決戰賽特')) {
      result.gameType = 'payanywhere_set2';
    } else if (file.name.includes('秦皇')) {
      result.gameType = 'waygame_qin';
      result.reelCount = 6;
      result.rowCounts = [4, 4, 4, 4, 4, 4];
    } else if (file.name.includes('奢華')) {
      result.gameType = 'linegame_set2';
    } else if (file.name.includes('家') || file.name.includes('象')) {
      result.gameType = 'waygame_elephant';
    } else if (!result.paylines || result.paylines.length === 0) {
      result.gameType = 'payanywhere';
    } else {
      result.gameType = 'waygame';
    }
  }

  return result;
}
