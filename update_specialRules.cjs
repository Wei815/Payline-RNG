const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// Replace 1:
content = content.replace(
    `      specialRules: { derivativeSymbols: { 'B1': ['B2'] } }`,
    `      specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] } }`
);

// Replace 2: line 497
content = content.replace(
    `const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };`,
    `const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] } } };`
);

// Replace 3: line 506
content = content.replace(
    `const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };`,
    `const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };`
);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated evaluateGrid calls");
