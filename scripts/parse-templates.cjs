const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const templatesDir = path.join(__dirname, '../templates');
const outputFile = path.join(__dirname, '../src/mocks/parsedTemplates.ts');

if (!fs.existsSync(templatesDir)) {
  console.error(`Templates directory not found at: ${templatesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
const parsedTemplates = {};

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const templateName = path.parse(file).name.replace('範本-', '');
  console.log(`Parsing template: ${templateName}`);
  
  const workbook = xlsx.readFile(filePath);
  const result = {};

  // 1. Line Table
  if (workbook.Sheets['Line Table']) {
    const lineData = xlsx.utils.sheet_to_json(workbook.Sheets['Line Table'], { header: 1 });
    const paylines = [];
    for (let i = 1; i < lineData.length; i++) {
      const row = lineData[i];
      if (row && row.length >= 7 && row[0] !== undefined) {
        paylines.push([row[2], row[3], row[4], row[5], row[6]]);
      }
    }
    if (paylines.length > 0) {
      result.paylines = paylines;
      result.gameType = 'linegame';
    }
  }

  // 2. Base Strips
  if (workbook.Sheets['Base']) {
    const baseData = xlsx.utils.sheet_to_json(workbook.Sheets['Base'], { header: 1 });
    const strips = [[], [], [], [], []];
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
    result.strips = strips.filter(s => s.length > 0);
  }

  // 3. Overview (Coin, Line, Reel sizes, Paytable)
  if (workbook.Sheets['Overview']) {
    const overviewData = xlsx.utils.sheet_to_json(workbook.Sheets['Overview'], { header: 1 });
    
    for (let i = 0; i < overviewData.length; i++) {
      const row = overviewData[i];
      if (!row) continue;
      if (row[0] === 'Coin') {
        if (overviewData[i+1] && overviewData[i+1][0] !== undefined) {
          result.coin = parseFloat(overviewData[i+1][0]);
        }
      }
      if (row[0] === 'Reel Size') {
        const sizes = [];
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
      if (overviewData[i] && overviewData[i][0] === 'Base\\Free:') {
        ptStart = i + 1;
        break;
      }
    }

    if (ptStart !== -1) {
      const paytableMap = {};
      
      for (let i = ptStart; i < overviewData.length; i += 5) {
        if (!overviewData[i]) continue;
        const headers = overviewData[i];
        if (!headers || headers.length === 0 || headers[0] !== undefined) continue; 
        
        for (let c = 1; c < headers.length; c++) {
          if (headers[c]) {
            const symId = String(headers[c]).trim();
            let realSymId = symId;
            if (symId === 'WW') realSymId = 'WX';
            if (symId === 'S1') realSymId = 'SCATTER';
            if (symId === 'W1') realSymId = 'M1';
            if (symId === 'W2') realSymId = 'M2';
            if (symId === 'W3') realSymId = 'M3';
            if (symId === 'W4') realSymId = 'M4';
            if (symId === 'WA') realSymId = 'A';
            if (symId === 'WK') realSymId = 'K';
            if (symId === 'WQ') realSymId = 'Q';
            if (symId === 'WJ') realSymId = 'J';
            if (symId === 'WT') realSymId = 'TE';
            if (symId === 'WN') realSymId = 'NI';
            
            paytableMap[realSymId] = {
              symbolId: realSymId,
              name: realSymId === 'WX' ? 'Wild' : realSymId === 'SCATTER' ? 'Scatter' : realSymId === 'B1' ? 'Bonus' : realSymId,
              payouts: { match2: 0, match3: 0, match4: 0, match5: 0 },
              isWild: realSymId === 'WX',
              isScatter: realSymId === 'SCATTER' || realSymId === 'B1'
            };
            
            for (let r = 1; r <= 4; r++) {
              if (overviewData[i+r]) {
                const matchCountStr = overviewData[i+r][0];
                if (matchCountStr) {
                  const matchCount = parseInt(matchCountStr);
                  let payout = overviewData[i+r][c];
                  if (payout === '--' || !payout) payout = 0;
                  else payout = parseFloat(payout) || 0;
                  
                  if (matchCount >= 2 && matchCount <= 5) {
                    paytableMap[realSymId].payouts[`match${matchCount}`] = payout;
                  }
                }
              }
            }
          }
        }
      }
      result.paytable = Object.values(paytableMap);
    }
  }

  parsedTemplates[templateName] = result;
}

const fileContent = `// Auto-generated by scripts/parse-templates.js
import type { PaytableRule } from '../types';

export interface ParsedTemplate {
  gameType?: 'waygame' | 'linegame' | 'payanywhere';
  coin?: number;
  bet?: number;
  paylines?: number[][];
  strips?: string[][];
  paytable?: PaytableRule[];
  reelCount?: number;
  rowCounts?: number[];
}

export const parsedTemplates: Record<string, ParsedTemplate> = ${JSON.stringify(parsedTemplates, null, 2)};
`;

fs.writeFileSync(outputFile, fileContent, 'utf8');
console.log(`Successfully generated ${outputFile}`);
