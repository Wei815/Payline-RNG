const fs = require('fs');
let content = fs.readFileSync('src/hooks/useRngSearch.ts', 'utf-8');

const nameOld = `              if (isGodsScatter) {
                const reelsStr = len === 2 ? "(1,3軸)" : (len === 3 ? "(1,3,5軸)" : "");
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\${reelsStr}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\${reelsStr}\`;
              } else {`;
              
const nameNew = `              if (isGodsScatter) {
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\`;
              } else {`;

content = content.replace(nameOld, nameNew);
content = content.replace(nameOld.replace(/\n/g, '\r\n'), nameNew.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/hooks/useRngSearch.ts', content, 'utf-8');
console.log("Removed reelsStr from name in useRngSearch.ts");
