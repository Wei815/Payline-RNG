const fs = require('fs');
let content = fs.readFileSync('src/hooks/useRngSearch.ts', 'utf-8');

const targetLenOld = `          const targetLengths = [];
          for (let l = startLen; l <= reelCount; l++) {
             targetLengths.push(l);
          }`;
const targetLenNew = `          const targetLengths = [];
          const maxLen = (gameType === 'linegame_gods' && isSelScatter) ? 3 : reelCount;
          for (let l = startLen; l <= maxLen; l++) {
             targetLengths.push(l);
          }`;

const placeOld = `              // Place targets and wilds
              const wildSymbol = (gameType === "linegame_gods" && isFreeGame) ? "WY" : "WX";
              for (let c = 0; c < len; c++) {
                if (W === 1 && c === 1) {
                   grid[c][line[c]] = wildSymbol;
                } else {
                   grid[c][line[c]] = selectedSymbol;
                }
              }`;
const placeNew = `              // Place targets and wilds
              const wildSymbol = (gameType === "linegame_gods" && isFreeGame) ? "WY" : "WX";
              const isGodsScatter = gameType === "linegame_gods" && isSelScatter;
              for (let c = 0; c < len; c++) {
                const targetCol = isGodsScatter ? c * 2 : c;
                if (targetCol >= reelCount) continue;
                if (W === 1 && c === 1) {
                   grid[targetCol][line[targetCol]] = wildSymbol;
                } else {
                   grid[targetCol][line[targetCol]] = selectedSymbol;
                }
              }`;

const nameOld = `              let name = "";
              const wildSymbolStr = (gameType === "linegame_gods" && isFreeGame) ? "WY" : "WX";
              if (isSelScatter) {
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\`;
              } else {
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\`;
              }`;
const nameNew = `              let name = "";
              const wildSymbolStr = (gameType === "linegame_gods" && isFreeGame) ? "WY" : "WX";
              const isGodsScatter = gameType === "linegame_gods" && isSelScatter;
              if (isGodsScatter) {
                const reelsStr = len === 2 ? "(1,3軸)" : (len === 3 ? "(1,3,5軸)" : "");
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\${reelsStr}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\${reelsStr}\`;
              } else {
                name = W === 0
                  ? \`\${selectedSymbol} * \${len}\`
                  : \`\${selectedSymbol} * \${len - W} + \${wildSymbolStr}\`;
              }`;

content = content.replace(targetLenOld, targetLenNew);
content = content.replace(targetLenOld.replace(/\n/g, '\r\n'), targetLenNew.replace(/\n/g, '\r\n'));
content = content.replace(placeOld, placeNew);
content = content.replace(placeOld.replace(/\n/g, '\r\n'), placeNew.replace(/\n/g, '\r\n'));
content = content.replace(nameOld, nameNew);
content = content.replace(nameOld.replace(/\n/g, '\r\n'), nameNew.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/hooks/useRngSearch.ts', content, 'utf-8');
console.log("Updated useRngSearch");
