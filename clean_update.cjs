const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// 1. Add import
content = content.replace(
    "import { useRngSearch } from '../../hooks/useRngSearch';",
    "import { useRngSearch } from '../../hooks/useRngSearch';\nimport { useGameStore } from '../../store/useGameStore';"
);

// 2. Add setIsFreeGame
content = content.replace(
    "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\n}) => {\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);",
    "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\n}) => {\n  const { setIsFreeGame } = useGameStore();\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);"
);

// 3. Add UI button
content = content.replace(
    `          <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">\n            系統將會產出盡量在此轉輪表中符合條件的唯一最佳配置\n          </span>\n        </div>`,
    `          <div className="flex flex-col gap-2 items-end">\n            <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">\n              系統將會產出盡量在此轉輪表中符合條件的唯一最佳配置\n            </span>\n            {gameType === 'linegame_gods' && (\n              <button\n                onClick={() => setIsFreeGame(!isFreeGame)}\n                className={\`px-3 py-1.5 rounded text-xs font-bold transition-colors \${isFreeGame ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'}\`}\n              >\n                {isFreeGame ? 'FG 模式 (WY)' : 'BG 模式 (WX)'}\n              </button>\n            )}\n          </div>\n        </div>`
);

// 4. Update rngStr block 1
content = content.replace(
    `                      if (gameType === 'linegame_set2') {\n                        const mathIdsStr = (c as any).fullMathIds ? \`[\${(c as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${c.rng?.join(',')}]\`;\n                        const classStr = (c as any).classStr;\n                        rngStr = classStr ? \`\${mathIdsStr}, \${classStr},\` : \`\${mathIdsStr},\`;`,
    `                      if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {\n                        const mathIdsStr = (c as any).fullMathIds ? \`[\${(c as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${c.rng?.join(',')}]\`;\n                        const classStr = (c as any).classStr;\n                        rngStr = classStr ? \`\${mathIdsStr},\\t\${classStr},\` : \`\${mathIdsStr},\`;`
);

// 5. Update rngStr block 2
content = content.replace(
    `                      if (gameType === 'linegame_set2') {\n                        const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx\n                          ? currentRngString\n                          : ((comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`);\n                        const classStr = (comb as any).classStr || combinedClassIdStr;\n                        const finalCopy = classStr ? \`\${mathIdsStr}, \${classStr},\` : \`\${mathIdsStr},\`;`,
    `                      if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {\n                        const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx\n                          ? currentRngString\n                          : ((comb as any).fullMathIds ? \`[\${(comb as any).fullMathIds.slice(0, 30).join(',')}]\` : \`[\${comb.rng.join(',')}]\`);\n                        const classStr = (comb as any).classStr || combinedClassIdStr;\n                        const finalCopy = classStr ? \`\${mathIdsStr},\\t\${classStr},\` : \`\${mathIdsStr},\`;`
);

// 6. Update config and logic in calculateCombinationWin
const oldLogic = `    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {\n       const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] } } };\n       \n       let grid: string[][];\n       if (gameType === 'linegame_set2') {\n         grid = rng;\n       } else {\n         grid = generateGridForComb(rng, comb.stripId);\n       }\n       \n       const wins = evaluateGrid(grid, currentPaytable, config, undefined, true);\n       const validWins = wins.filter(w => w.totalWin > 0);\n       const formulaStr = validWins.map(w => \`\${w.symbolId}*\${w.matchCount}=\${w.totalWin}\`).join('+') || '0';\n       const totalWin = validWins.reduce((s, w) => s + w.totalWin, 0);\n       return { formula: totalWin > 0 ? \`Win=\${formulaStr}=\${totalWin}\` : 'Win=0', totalWin };\n    }`;

const newLogic = `    if (gameType !== 'waygame' && gameType !== 'waygame_elephant' && gameType !== 'megaway' && gameType !== 'waygame_qin') {\n       const wyConfigs: Record<number, { a: number, b: number, z: 0 | 1 }> = {};\n       if (gameType === 'linegame_gods' && isFreeGame) {\n          for (let i = 0; i < reelCount; i++) {\n             wyConfigs[i] = { a: 2, b: 10, z: 0 };\n          }\n       }\n       \n       const config: GameConfig = { \n         gameType, \n         paylines: customPaylines, \n         effectiveBet: bet, \n         goldFrames: gameType === 'linegame_set2' ? goldFrames : {}, \n         specialRules: { derivativeSymbols: { 'B1': ['B2'] } },\n         wyConfigs: gameType === 'linegame_gods' && isFreeGame ? wyConfigs : undefined\n       };\n       \n       let grid: string[][];\n       if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {\n         const mathIdToSymbol: Record<string, string> = {};\n         currentPaytable.forEach(p => {\n           if (p.mathId !== undefined) {\n             const ids = String(p.mathId).split(',').map(s => s.trim());\n             mathIdToSymbol[ids[0]] = p.symbolId;\n           }\n         });\n         grid = rng.map((colStr: string) => {\n           return colStr.split(',').map(id => mathIdToSymbol[id] || id);\n         });\n       } else {\n         grid = generateGridForComb(rng, comb.stripId);\n       }\n       \n       const wins = evaluateGrid(grid, currentPaytable, config, undefined, true);\n       const validWins = wins.filter(w => w.totalWin > 0);\n       const formulaStr = validWins.map(w => \`\${w.symbolId}*\${w.matchCount}=\${w.totalWin}\`).join('+') || '0';\n       const totalWin = validWins.reduce((s, w) => s + w.totalWin, 0);\n       \n       const isInterference = (selectedSymbol === 'WIN_MULTIPLIER' || selectedSymbol === 'COMBO')\n          ? false\n          : selectedSymbol === 'B1/B2'\n          ? validWins.some(w => w.symbolId !== 'B1' && w.symbolId !== 'B2')\n          : validWins.some(w => w.symbolId !== selectedSymbol);\n\n       if (isInterference) {\n          return { formula: totalWin > 0 ? \`Win=\${formulaStr}=\${totalWin}\` : 'Win=0', totalWin };\n       } else {\n          return { formula: totalWin > 0 ? \`Win=\${totalWin}\` : 'Win=0', totalWin };\n       }\n    }`;
content = content.replace(oldLogic, newLogic);

// 7. Config 2
content = content.replace(
    "const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };",
    "const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames: gameType === 'linegame_set2' ? goldFrames : {}, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };"
);

// 8. hasInterference logic (diff from 諸神V1)
const oldFormula = `    if (formulaParts.length > 0) {\n      return { formula: \`Win=\${formulaParts.join('+')}=\${totalWinAccumulated}\`, totalWin: totalWinAccumulated };\n    }`;
const newFormula = `    if (formulaParts.length > 0) {\n      const hasInterference = formulaParts.some(part => {\n         if (selectedSymbol === 'WIN_MULTIPLIER' || selectedSymbol === 'COMBO') return false;\n         if (selectedSymbol === 'B1/B2') return !part.startsWith('B1') && !part.startsWith('B2');\n         return !part.startsWith(selectedSymbol);\n      });\n      \n      if (hasInterference) {\n         return { formula: \`Win=\${formulaParts.join('+')}=\${totalWinAccumulated}\`, totalWin: totalWinAccumulated };\n      } else {\n         return { formula: \`Win=\${totalWinAccumulated}\`, totalWin: totalWinAccumulated };\n      }\n    }`;
content = content.replace(oldFormula, newFormula);

// 9. sortedCombinations logic (from 諸神V1)
content = content.replace(
    "                  const textToCopy = [...combinations]\n                    .filter(c => c.rng && !c.isInterfered)",
    "                  const sortedCombinations = [...combinations].sort((a, b) => {\n                    if (a.wildCount === 0 && b.wildCount > 0) return -1;\n                    if (a.wildCount > 0 && b.wildCount === 0) return 1;\n                    return 0;\n                  });\n                  const textToCopy = sortedCombinations\n                    .filter(c => c.rng && !c.isInterfered)"
);
content = content.replace(
    "                  const items = [...combinations]\n                    .map(c => {",
    "                  const sortedCombinations = [...combinations].sort((a, b) => {\n                    if (a.wildCount === 0 && b.wildCount > 0) return -1;\n                    if (a.wildCount > 0 && b.wildCount === 0) return 1;\n                    return 0;\n                  });\n                  const items = sortedCombinations\n                    .map(c => {"
);

// 10. gameType === 'linegame_gods' updates
content = content.replace(
    "                        {showGoldFrameEditor && goldFrames[`${colIndex}-${rowIndex}`] !== undefined && (",
    "                        {gameType === 'linegame_set2' && showGoldFrameEditor && goldFrames[`${colIndex}-${rowIndex}`] !== undefined && ("
);
content = content.replace(
    "                        {showJackpotEditor && jackpots[`${colIndex}-${rowIndex}`] !== undefined && (",
    "                        {gameType === 'linegame_set2' && showJackpotEditor && jackpots[`${colIndex}-${rowIndex}`] !== undefined && ("
);
content = content.replace(
    "                          {w.symbolId} {w.matchCount > 0 && (gameType === 'payanywhere' || gameType === 'payanywhere_set2' ? `個數 ${w.matchCount}` : gameType === 'linegame' || gameType === 'linegame_set2' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`)}",
    "                          {w.symbolId} {w.matchCount > 0 && (gameType === 'payanywhere' || gameType === 'payanywhere_set2' ? `個數 ${w.matchCount}` : gameType === 'linegame' || gameType === 'linegame_set2' || gameType === 'linegame_gods' ? `線 ${(w.lineIndex ?? 0) + 1} 連線 ${w.matchCount}` : `連線 ${w.matchCount}`)}"
);
content = content.replace(
    "      {!gameType.startsWith('waygame') && (",
    "      {!gameType.startsWith('waygame') && gameType !== 'linegame_gods' && ("
);
content = content.replace(
    "                <span className=\"text-base font-bold text-purple-400\">{gameType === 'linegame_set2' ? '啟用金框' : '啟用 Scatter (S1/S2)'}</span>",
    "                <span className=\"text-base font-bold text-purple-400\">{gameType === 'linegame_set2' ? '啟用金框' : (gameType === 'linegame_gods' ? '啟用 WY/WZ' : '啟用 Scatter (S1/S2)')}</span>"
);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
