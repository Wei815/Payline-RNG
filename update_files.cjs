const fs = require('fs');

let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');
const oldText = `    const isMathIdGrid = gameType === 'linegame_set2' || gameType === 'linegame_gods' || gameType === 'payanywhere_set2';
    let grid = isMathIdGrid ? generateGridFromMathIds(rng) : generateGridForComb(rng, comb.stripId);`;
const newText = `    let grid = generateGridForComb(rng, comb.stripId);`;
content = content.replace(oldText, newText);
content = content.replace(oldText.replace(/\n/g, '\r\n'), newText.replace(/\n/g, '\r\n'));
fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated SlotGeneratorTab.tsx");

let regContent = fs.readFileSync('src/core/GameRegistry.ts', 'utf-8');
const oldReg = `import { MermaidGame } from '../games/Mermaid/MermaidGame';`;
const newReg = `import { MermaidGame } from '../games/mermaid/MermaidGame';`;
regContent = regContent.replace(oldReg, newReg);
fs.writeFileSync('src/core/GameRegistry.ts', regContent, 'utf-8');
console.log("Updated GameRegistry.ts");
