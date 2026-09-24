const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const targetCalcWinOld = `  const calculateCombinationWin = (comb: any) => {
    let rng = comb.rng;
    if (!rng || rng.length === 0) return { formula: 'Win=0', totalWin: 0 };
    
    // We only support normal ways game cascading format for now
    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {
       const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };`;

const targetCalcWinNew = `  const calculateCombinationWin = (comb: any) => {
    let rng = comb.rng;
    if (!rng || rng.length === 0) return { formula: 'Win=0', totalWin: 0 };
    
    let wyConfigs: any = undefined;
    if (gameType === 'linegame_gods') {
      wyConfigs = {};
      for (let c = 0; c < reelCount; c++) {
        wyConfigs[c] = { a: 2, b: 10, z: 0 };
      }
    }

    // We only support normal ways game cascading format for now
    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {
       const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, wyConfigs, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };`;

content = content.replace(targetCalcWinOld, targetCalcWinNew);
content = content.replace(targetCalcWinOld.replace(/\n/g, '\r\n'), targetCalcWinNew.replace(/\n/g, '\r\n'));

const targetCalcWinOld2 = `    const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };`;
const targetCalcWinNew2 = `    const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, wyConfigs, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };`;

content = content.replace(targetCalcWinOld2, targetCalcWinNew2);
content = content.replace(targetCalcWinOld2.replace(/\n/g, '\r\n'), targetCalcWinNew2.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Added wyConfigs to calculateCombinationWin config");
