import * as xlsx from 'xlsx';
import type { PaytableRule } from '../types';

export interface ExcelParsedData {
  gameType?: 'waygame' | 'linegame' | 'payanywhere';
  coin?: number;
  bet?: number;
  paylines?: number[][];
  strips?: string[][];
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
    if (lineData.length > 1) {
      const headerRow = lineData[1] || lineData[0];
      if (headerRow[0] === 'No.' && headerRow[1] === 'R1') {
        colOffset = 1;
      }
    }

    for (let i = 1; i < lineData.length; i++) {
      const row = lineData[i];
      if (row && row.length >= colOffset + 5 && row[0] !== undefined && !isNaN(Number(row[0]))) {
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
      if (file.name.includes('奢華')) {
        result.gameType = 'linegame_set2';
      } else {
        result.gameType = 'linegame'; // if there's a line table, it's likely a linegame
      }
    }
  }

  // 2. Base Strips
  if (workbook.Sheets['Base']) {
    const baseData = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets['Base'], { header: 1 });
    const strips: string[][] = [[], [], [], [], []];
    for (let i = 3; i < baseData.length; i++) {
      const row = baseData[i];
      if (!row) continue;
      for (let c = 0; c < 5; c++) {
        const sym = row[6 + c];
        if (sym !== undefined && sym !== null && sym !== '') {
          strips[c].push(String(sym).trim());
        }
      }
    }
    // Filter out empty arrays if some reels are empty
    result.strips = strips.filter(s => s.length > 0);
  }

  // 3. Overview (Coin, Line, Reel sizes, Paytable)
  if (workbook.Sheets['Overview']) {
    const overviewData = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets['Overview'], { header: 1 });
    
    for (let i = 0; i < overviewData.length; i++) {
      const row = overviewData[i];
      if (!row) continue;
      if (row[0] === 'Coin' && result.coin === undefined) {
        if (overviewData[i+1] && overviewData[i+1][0] !== undefined) {
          result.coin = parseFloat(overviewData[i+1][0]);
          result.bet = result.coin;
        }
      }
      if (row[0] === 'Reel Size') {
        const sizes: number[] = [];
        for (let c = 1; c <= 5; c++) {
          if (row[c] !== undefined) sizes.push(parseInt(row[c]));
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
                  isScatter: realSymId === 'SCATTER' || realSymId === 'B1' || realSymId === 'B2' || realSymId === 'S1' || realSymId === 'S2',
                  mathId: newMathId,
                  isEnabled: newMathId !== undefined
                };
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
                    isScatter: realSymId === 'SCATTER' || realSymId === 'B1' || realSymId === 'B2' || realSymId === 'S1' || realSymId === 'S2',
                    mathId: newMathId,
                    isEnabled: newMathId !== undefined
                  };
                }

                for (let r = payoutStartOffset; r < payoutStartOffset + 5; r++) {
                  if (overviewData[i+r]) {
                    const matchCountStr = String(overviewData[i+r][0] || overviewData[i+r][headerStartCol - 1] || '').trim();
                    if (matchCountStr) {
                      let matchKey: keyof PaytableRule['payouts'] | null = null;
                      
                      // 1. Direct numbers (2, 3, 4, 5, 6)
                      const matchCount = parseInt(matchCountStr);
                      if (!isNaN(matchCount) && matchCount >= 2 && matchCount <= 6 && !matchCountStr.includes('-') && !matchCountStr.includes('+')) {
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
      result.paytable = Object.values(paytableMap);
  }

  return result;
}
