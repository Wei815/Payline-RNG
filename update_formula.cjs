const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const formulaOld = "const formulaStr = validWins.map(w => `${w.symbolId}*${w.matchCount}=${w.totalWin}`).join('+') || '0';";
const formulaNew = "const formulaStr = validWins.map(w => `${w.symbolId}*${w.matchCount}${w.multiplier ? `(x${w.multiplier})` : ''}=${w.totalWin}`).join('+') || '0';";

content = content.replace(formulaOld, formulaNew);
fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated formula string");
