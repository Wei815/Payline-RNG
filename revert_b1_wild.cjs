const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// The string we injected:
// `specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] } }`

// Revert 1 (line 208)
content = content.replace(
    `specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] } }`,
    `specialRules: { derivativeSymbols: { 'B1': ['B2'] } }`
);

// Revert 2 (line 497)
content = content.replace(
    `specialRules: { derivativeSymbols: { 'B1': gameType === 'linegame_gods' ? ['B2', isFreeGame ? 'WY' : 'WX'] : ['B2'] } }`,
    `specialRules: { derivativeSymbols: { 'B1': ['B2'] } }`
);

// Wait, line 506 didn't have gameType === linegame_gods in it anymore, because I just fixed it in the previous step.
// Let's just do a global replace for any remaining ones!
content = content.replace(
    /specialRules:\s*\{\s*derivativeSymbols:\s*\{\s*'B1':\s*gameType\s*===\s*'linegame_gods'\s*\?\s*\['B2',\s*isFreeGame\s*\?\s*'WY'\s*:\s*'WX'\]\s*:\s*\['B2'\]\s*\}\s*\}/g,
    `specialRules: { derivativeSymbols: { 'B1': ['B2'] } }`
);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Reverted B1 wild substitution.");
