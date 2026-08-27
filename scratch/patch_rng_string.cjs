const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf8');

code = code.replace(
  '  const currentRngString = `[${currentFormattedRngArray.join(\',\')}],`;',
  `  const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType === 'waygame' || gameType === 'megaway') {
      const extraId = (targetComb as any)?.stripId !== undefined ? Number((targetComb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 1) : 1);
      return \`[\${[...currentFormattedRngArray, extraId].join(',')}],\`;
    }
    return \`[\${currentFormattedRngArray.join(',')}],\`;
  })();`
);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', code);
console.log('Patched currentRngString');
