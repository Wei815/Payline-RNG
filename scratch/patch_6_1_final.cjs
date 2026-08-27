const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf8');

// 1. finalRng and string template for top combinations
code = code.replace(
  /\(comb as any\)\.stripId \!== undefined \? Number\(\(comb as any\)\.stripId\) : \(stripSets \? Number\(Object\.keys\(stripSets\)\.find\(k => stripSets\[k\] === currentStrips\) \|\| 1\) : 1\)/g,
  '(comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)'
);

// 2. extraId for bottom rendering
code = code.replace(
  /\(targetComb as any\)\?\.stripId \!== undefined \? Number\(\(targetComb as any\)\.stripId\) : \(stripSets \? Number\(Object\.keys\(stripSets\)\.find\(k => stripSets\[k\] === currentStrips\) \|\| 1\) : 1\)/g,
  '(targetComb as any)?.stripId !== undefined ? Number((targetComb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)'
);

// 3. onChange logic
const onChangeOld = `                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      setManualIndicesOther(parsed);
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}`;
const onChangeNew = `                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      if (parsed.length > reelCount) {
                        const extraId = Number(parsed[reelCount]);
                        if (!isNaN(extraId) && setActiveStripId) {
                          setActiveStripId(extraId);
                        }
                        setManualIndicesOther(parsed.slice(0, reelCount));
                      } else {
                        setManualIndicesOther(parsed);
                      }
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}`;

if (code.includes(onChangeOld)) {
    code = code.replace(onChangeOld, onChangeNew);
} else {
    console.log("Could not find onChange block!");
}

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', code);
console.log('Successfully patched UI and pasting logic for 6+1 format!');
