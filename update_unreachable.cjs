const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const oldLine = "`[${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]${gameType === 'linegame_gods' && isFreeGame ? ',\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`,\\t\${((comb as any).classStr || combinedClassIdStr)},\` : '')}`";
const newLine = "`[${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]${gameType === 'linegame_gods' && isFreeGame ? ',\\t[2,10,0],' : ''}`";

content = content.replace(oldLine, newLine);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated line 1044");
