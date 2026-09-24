const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const targetOld = `  const generateGridForComb = (rngStrArray: string[], stripId?: number) => {`;
const targetNew = `  const generateGridFromMathIds = (rngStrArray: string[]) => {
    const mathIdToSymbol: Record<string, string> = {};
    currentPaytable.forEach(p => {
      if (p.mathId !== undefined) {
        const ids = String(p.mathId).split(',').map(s => s.trim());
        ids.forEach(id => {
          mathIdToSymbol[id] = p.symbolId;
        });
      }
    });
    
    const grid: string[][] = [];
    for (let c = 0; c < reelCount; c++) {
      const colStr = rngStrArray[c];
      if (!colStr) {
        grid.push(Array(rowCounts[c] || 3).fill('-'));
        continue;
      }
      const mathIds = colStr.split(',');
      const colSymbols = mathIds.map(mId => {
        let sym = mathIdToSymbol[mId] || mId;
        if (mId === "15" && gameType.includes("set2")) sym = "F1";
        if (mId === "19" && gameType.includes("set2")) sym = "L1";
        return sym;
      });
      grid.push(colSymbols);
    }
    return grid;
  };

  const generateGridForComb = (rngStrArray: string[], stripId?: number) => {`;

content = content.replace(targetOld, targetNew);

// Replace in calculateCombinationWin (first call)
const calcOld1 = `    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {
       const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };
       const grid = generateGridForComb(rng, comb.stripId);`;
const calcNew1 = `    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {
       const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };
       const isMathIdGrid = gameType === 'linegame_set2' || gameType === 'linegame_gods' || gameType === 'payanywhere_set2';
       const grid = isMathIdGrid ? generateGridFromMathIds(rng) : generateGridForComb(rng, comb.stripId);`;
       
// Replace in calculateCombinationWin (second call)
const calcOld2 = `    const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };
    
    let grid = generateGridForComb(rng, comb.stripId);`;
const calcNew2 = `    const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };
    
    const isMathIdGrid = gameType === 'linegame_set2' || gameType === 'linegame_gods' || gameType === 'payanywhere_set2';
    let grid = isMathIdGrid ? generateGridFromMathIds(rng) : generateGridForComb(rng, comb.stripId);`;

content = content.replace(calcOld1, calcNew1);
content = content.replace(calcOld1.replace(/\n/g, '\r\n'), calcNew1.replace(/\n/g, '\r\n'));
content = content.replace(calcOld2, calcNew2);
content = content.replace(calcOld2.replace(/\n/g, '\r\n'), calcNew2.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated calculateCombinationWin");
