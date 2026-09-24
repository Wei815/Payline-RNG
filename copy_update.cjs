const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// Block 1: 複製全部腳本
const block1Old = `                      if (gameType === 'linegame_set2') {
                        const mathIdsStr = (c as any).fullMathIds ? \`[\${(c as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${c.rng?.join(',')}]\`;
                        const classStr = (c as any).classStr;
                        rngStr = classStr ? \`\${mathIdsStr}, \${classStr},\` : \`\${mathIdsStr},\`;
                      } else if (gameType === 'payanywhere_set2') {`;

const block1New = `                      if (gameType === 'linegame_set2') {
                        const mathIdsStr = (c as any).fullMathIds ? \`[\${(c as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${c.rng?.join(',')}]\`;
                        const classStr = (c as any).classStr;
                        rngStr = classStr ? \`\${mathIdsStr},\\t\${classStr},\` : \`\${mathIdsStr},\`;
                      } else if (gameType === 'linegame_gods' && isFreeGame) {
                        const mathIdsStr = (c as any).fullMathIds ? \`[\${(c as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${c.rng?.join(',')}]\`;
                        rngStr = \`\${mathIdsStr},\\t[2,10,0],\`;
                      } else if (gameType === 'payanywhere_set2') {`;

// Block 3: 複製全部測案
const block3Old = `                      rngStr = \`[\${finalRng?.join(',')}],\`;
                      
                      const winInfo = calculateCombinationWin(c);`;

const block3New = `                      rngStr = \`[\${finalRng?.join(',')}],\`;
                      if (gameType === 'linegame_gods' && isFreeGame) {
                          rngStr += \`\\t[2,10,0],\`;
                      } else if (gameType === 'linegame_set2' && (c as any).classStr) {
                          rngStr += \`\\t\${(c as any).classStr},\`;
                      }
                      
                      const winInfo = calculateCombinationWin(c);`;

// Block 2: COPY (single block)
const block2Old = `                      if (gameType === 'linegame_set2') {
                        const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx
                          ? currentRngString
                          : ((comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`);
                        const classStr = (comb as any).classStr || combinedClassIdStr;
                        const finalCopy = classStr ? \`\${mathIdsStr}, \${classStr},\` : \`\${mathIdsStr},\`;
                        navigator.clipboard.writeText(finalCopy);
                      } else if (gameType === 'payanywhere_set2') {`;

const block2New = `                      if (gameType === 'linegame_set2') {
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
                      } else if (gameType === 'payanywhere_set2') {`;

content = content.split('\r\n').join('\n');
content = content.replace(block1Old, block1New);
content = content.replace(block2Old, block2New);
content = content.replace(block3Old, block3New);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Blocks replaced.");
