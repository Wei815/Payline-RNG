const fs = require('fs');

const funcCode = `
export async function findRngForCombos(
  maxCombo: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = Array(maxCombo).fill(null);
  let filledCount = 0;
  
  const ATTEMPTS = 20000;
  
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt % 500 === 0) await new Promise(r => setTimeout(r, 0));
    
    const candidateRng = Array(reelCount).fill(0).map((_, c) => Math.floor(Math.random() * (currentStrips[c]?.length || 1)));
    
    let currentGrid = candidateRng.map((start, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = currentStrips[cIdx] || ['-'];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });
    
    let drawIndices = [...candidateRng].map(idx => idx - 1);
    let cascadeCount = 0;
    
    while (cascadeCount < 20) {
      let evalGrid = currentGrid;
      if (gameType === 'megaway' && topTrackerOther) {
        evalGrid = currentGrid.map((col, colIdx) => {
          if (colIdx >= 1 && colIdx <= 4) {
             const topSym = topTrackerOther[colIdx - 1] || 'WX';
             return [...col, topSym];
          }
          return col;
        });
      }
      
      const simWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
      const cascadeWins = simWins.filter(w => w.payout > 0 || ((w.symbolId === 'B1' || w.symbolId === 'S1') && w.matchCount >= 3));
      
      if (cascadeWins.length === 0) break;
      
      const winningCoordsMap = getWinningPositions(evalGrid, cascadeWins, currentPaytable, gameType, undefined, customPaylines);
      let hasElimination = false;
      
      for (let c = 0; c < reelCount; c++) {
        const strip = currentStrips[c];
        const rows = rowCounts[c] || 3;
        const eliminatedRows: number[] = [];
        for (let r = 0; r < rows; r++) {
          if (winningCoordsMap.has(\`\${c}-\${r}\`)) {
            if (gameType === 'waygame_qin' && isFreeGame && currentGrid[c][r] === 'S1') continue;
            const winIndices = winningCoordsMap.get(\`\${c}-\${r}\`);
            if (winIndices && winIndices.some(idx => idx !== 999)) {
              eliminatedRows.push(r);
            }
          }
        }
        
        if (eliminatedRows.length > 0) {
          hasElimination = true;
          eliminatedRows.sort((a, b) => b - a);
          for (const r of eliminatedRows) {
            if (gameType === 'payanywhere_set2') {
              for (let shift = r; shift > 0; shift--) {
                currentGrid[c][shift] = currentGrid[c][shift - 1];
              }
              const len = strip.length;
              const drawIdx = (((drawIndices[c] % len) + len) % len);
              currentGrid[c][0] = strip[drawIdx];
              drawIndices[c]--;
            } else {
              const len = strip.length;
              const drawIdx = (((drawIndices[c] % len) + len) % len);
              currentGrid[c][r] = strip[drawIdx];
              drawIndices[c]--;
            }
          }
        }
      }
      
      if (!hasElimination) break;
      cascadeCount++;
    }
    
    if (cascadeCount > 0 && cascadeCount <= maxCombo) {
      if (results[cascadeCount - 1] === null) {
        results[cascadeCount - 1] = candidateRng;
        filledCount++;
        if (filledCount === maxCombo) break;
      }
    }
  }
  
  return results;
}
`;

fs.appendFileSync('src/utils/rngSearch.ts', '\n' + funcCode + '\n');
