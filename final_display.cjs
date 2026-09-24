const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// 1. Update currentRngString logic
const currentRngOld = `  const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType.includes('waygame') || gameType.includes('megaway')) {
      const extraId = (targetComb as any)?.stripId !== undefined && !isManualEdited ? Number((targetComb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0);
      return \`[\${[...currentFormattedRngArray, extraId].join(',')}]\` + ',';
    }
    return \`[\${currentFormattedRngArray.join(',')}]\` + ',';
  })();`;
// Let's use a regex to match currentRngString just in case it differs slightly
const currentRngRegex = /const currentRngString = \(\(\) => \{[\s\S]*?return `\[\$\{currentFormattedRngArray\.join\(\',\',\)\}\],`;\s*\}\)\(\);/;

const currentRngNew = `  const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType.includes('waygame') || gameType.includes('megaway')) {
      const extraId = (targetComb as any)?.stripId !== undefined && !isManualEdited ? Number((targetComb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0);
      return \`[\${[...currentFormattedRngArray, extraId].join(',')}]\` + ',';
    }
    let baseStr = \`[\${currentFormattedRngArray.join(',')}]\` + ',';
    if (gameType === 'linegame_gods' && isFreeGame) {
      baseStr += \`\\t[2,10,0],\`;
    } else if (gameType === 'linegame_set2') {
      const classStr = (targetComb as any)?.classStr || combinedClassIdStr;
      if (classStr) {
        baseStr += \`\\t\${classStr},\`;
      }
    }
    return baseStr;
  })();`;

content = content.replace(currentRngRegex, currentRngNew);
if(content.indexOf("baseStr") === -1) {
    // try exact match if regex fails
    content = content.replace(
        "    return `[${currentFormattedRngArray.join(',')}],`;\n  })();",
        "    let baseStr = `[${currentFormattedRngArray.join(',')}],`;\n    if (gameType === 'linegame_gods' && isFreeGame) {\n      baseStr += `\\t[2,10,0],`;\n    } else if (gameType === 'linegame_set2') {\n      const classStr = (targetComb as any)?.classStr || combinedClassIdStr;\n      if (classStr) {\n        baseStr += `\\t${classStr},`;\n      }\n    }\n    return baseStr;\n  })();"
    );
    // crlf 
    content = content.replace(
        "    return `[${currentFormattedRngArray.join(',')}],`;\r\n  })();",
        "    let baseStr = `[${currentFormattedRngArray.join(',')}],`;\r\n    if (gameType === 'linegame_gods' && isFreeGame) {\r\n      baseStr += `\\t[2,10,0],`;\r\n    } else if (gameType === 'linegame_set2') {\r\n      const classStr = (targetComb as any)?.classStr || combinedClassIdStr;\r\n      if (classStr) {\r\n        baseStr += `\\t${classStr},`;\r\n      }\r\n    }\r\n    return baseStr;\r\n  })();"
    );
}

// 2. Update Single COPY logic to not duplicate
// Let's replace the whole single copy logic for linegame_set2 and linegame_gods
const singleCopyOld = `                      if (gameType === 'linegame_set2') {
                        const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx
                          ? currentRngString
                          : ((comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`);
                        const classStr = (comb as any).classStr || combinedClassIdStr;
                        const finalCopy = classStr ? \`\${mathIdsStr},\\t\${classStr},\` : \`\${mathIdsStr},\`;
                        navigator.clipboard.writeText(finalCopy);
                      } else if (gameType === 'linegame_gods' && isFreeGame) {
                        const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx
                          ? currentRngString
                          : ((comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`);
                        navigator.clipboard.writeText(\`\${mathIdsStr},\\t[2,10,0],\`);
                      }`;

const singleCopyNew = `                      if (isManualEdited && selectedCombIndex === globalIdx) {
                        navigator.clipboard.writeText(currentRngString);
                      } else if (gameType === 'linegame_set2') {
                        const mathIdsStr = (comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`;
                        const classStr = (comb as any).classStr || combinedClassIdStr;
                        const finalCopy = classStr ? \`\${mathIdsStr},\\t\${classStr},\` : \`\${mathIdsStr},\`;
                        navigator.clipboard.writeText(finalCopy);
                      } else if (gameType === 'linegame_gods' && isFreeGame) {
                        const mathIdsStr = (comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`;
                        navigator.clipboard.writeText(\`\${mathIdsStr},\\t[2,10,0],\`);
                      }`;
content = content.replace(singleCopyOld, singleCopyNew);
// handle CRLF just in case
content = content.replace(singleCopyOld.replace(/\n/g, '\r\n'), singleCopyNew.replace(/\n/g, '\r\n'));


// 3. Update Visual Box Display of RNG array
const visualOld = `                      ) : (
                        <span className="truncate block" title={\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : \`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',')}]: \${comb.rng.join(',')}]\`} \${comb.isInterfered ? '(干擾)' : ''} \${(comb as any).hasS1Drop ? '(SC下落)' : ''}\`}>
                          {\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : \`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',')}]: \${comb.rng.join(',')}]\`} \${comb.isInterfered ? '(干擾)' : ''} \${(comb as any).hasS1Drop ? '(SC下落)' : ''}\`}
                        </span>`;

// Use regex because the ternary is very long
const visualRegex = /<span className="truncate block" title=\{\`RNG: \$\{selectedCombIndex === globalIdx && isManualEdited \? currentRngString : \`\[\$\{\(gameType\.includes\('waygame'\) \|\| gameType\.includes\('megaway'\)\) \? \[\.\.\.comb\.rng\.slice\(0, 6\), \(comb as any\)\.stripId !== undefined \? Number\(\(comb as any\)\.stripId\) : \(stripSets \? Number\(Object\.keys\(stripSets\)\.find\(k => stripSets\[k\] === currentStrips\) \|\| 0\) : 0\)\].join\(\',\',\) : comb\.rng\.join\(\',\'\)\}\]\`\} \$\{comb\.isInterfered \? '\(干擾\)' : ''\} \$\{\(comb as any\)\.hasS1Drop \? '\(SC下落\)' : ''\}\`\}>/g;

content = content.replace(visualRegex, (match) => {
    return `<span className="truncate block" title={\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : (\`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]\` + (gameType === 'linegame_gods' && isFreeGame ? '\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`\\t\${((comb as any).classStr || combinedClassIdStr)},\` : ',')) )} \${comb.isInterfered ? '(干擾)' : ''} \${(comb as any).hasS1Drop ? '(SC下落)' : ''}\`}>`;
});

// Replace the inner content of the span too
const innerVisualRegex = /\{`RNG: \$\{selectedCombIndex === globalIdx && isManualEdited \? currentRngString : `\[\$\{\(gameType\.includes\('waygame'\) \|\| gameType\.includes\('megaway'\)\) \? \[\.\.\.comb\.rng\.slice\(0, 6\), \(comb as any\)\.stripId !== undefined \? Number\(\(comb as any\)\.stripId\) : \(stripSets \? Number\(Object\.keys\(stripSets\)\.find\(k => stripSets\[k\] === currentStrips\) \|\| 0\) : 0\)\].join\(\',\',\) : comb\.rng\.join\(\',\'\)\}\]`\} \$\{comb\.isInterfered \? '\(干擾\)' : ''\} \$\{\(comb as any\)\.hasS1Drop \? '\(SC下落\)' : ''\}`\}/g;

content = content.replace(innerVisualRegex, (match) => {
    return `{\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : (\`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]\` + (gameType === 'linegame_gods' && isFreeGame ? '\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`\\t\${((comb as any).classStr || combinedClassIdStr)},\` : ',')) )} \${comb.isInterfered ? '(干擾)' : ''} \${(comb as any).hasS1Drop ? '(SC下落)' : ''}\`}`;
});

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Done");
