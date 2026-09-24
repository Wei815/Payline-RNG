const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const copyScriptsOld = `                onClick={() => {
                  const textToCopy = [...combinations]
                    .filter(c => c.rng && !c.isInterfered)`;
const copyScriptsNew = `                onClick={() => {
                  const sortedCombs = [...combinations].sort((a, b) => {
                    if (a.wildCount !== b.wildCount) return a.wildCount - b.wildCount;
                    return a.length - b.length;
                  });
                  const textToCopy = sortedCombs
                    .filter(c => c.rng && !c.isInterfered)`;

const copyTestsOld = `                onClick={() => {
                  const items = [...combinations]
                    .map(c => {`;
const copyTestsNew = `                onClick={() => {
                  const sortedCombs = [...combinations].sort((a, b) => {
                    if (a.wildCount !== b.wildCount) return a.wildCount - b.wildCount;
                    return a.length - b.length;
                  });
                  const items = sortedCombs
                    .map(c => {`;

content = content.replace(copyScriptsOld, copyScriptsNew);
content = content.replace(copyScriptsOld.replace(/\n/g, '\r\n'), copyScriptsNew.replace(/\n/g, '\r\n'));
content = content.replace(copyTestsOld, copyTestsNew);
content = content.replace(copyTestsOld.replace(/\n/g, '\r\n'), copyTestsNew.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Updated copy buttons with sorting.");
