const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf8');

// Update currentRngString
const currOldRegex = /const currentRngString = \(\(\) => \{[\s\S]*?\}\(\);/;
const currNew = `const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType === 'waygame' || gameType === 'megaway') {
      const extraId = (targetComb as any)?.stripId !== undefined && !isManualEdited 
        ? Number((targetComb as any).stripId) + 1 
        : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1);
      return \`[\${[...currentFormattedRngArray, extraId].join(',')}],\`;
    }
    return \`[\${currentFormattedRngArray.join(',')}],\`;
  })();`;

code = code.replace(currOldRegex, currNew);

// Update finalCopy
const finalCopyRegex = /const finalCopy = \`\[\$\{comb\.rng\.join\(\',\ '\)\}\]\,\`;/g;
const finalCopyNew = `const finalRng = (gameType === 'waygame' || gameType === 'megaway') 
                        ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)]
                        : comb.rng;
                      const finalCopy = \`[\${finalRng.join(',')}],\`;`;

code = code.replace(finalCopyRegex, finalCopyNew);

// Update UI string in button
const uiStringRegex = /\{\`RNG: \$\{selectedCombIndex === idx && isManualEdited \? currentRngString : \\\`\[\\\$\{comb\.rng\.join\(\',\ '\)\}\]\\\`\} \`\}/g;
const uiStringNew = `{\`RNG: \${selectedCombIndex === idx && isManualEdited ? currentRngString : \\\`[\\\${(gameType === 'waygame' || gameType === 'megaway') ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)].join(',') : comb.rng.join(',')}]\\\`} \`}`;

code = code.replace(uiStringRegex, uiStringNew);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', code);
