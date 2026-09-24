const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const targetOld = `                      ) : (
                        <span className="truncate block" title={\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : \`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]\${gameType === 'linegame_gods' && isFreeGame ? ',\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`,\\t\${((comb as any).classStr || combinedClassIdStr)},\` : '')}\`} \${comb.isInterfered ? '(有干擾)' : ''} \${(comb as any).hasS1Drop ? '(有S1掉落)' : ''}\`}>
                          {\`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : \`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]\${gameType === 'linegame_gods' && isFreeGame ? ',\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`,\\t\${((comb as any).classStr || combinedClassIdStr)},\` : '')}\`} \${comb.isInterfered ? '(有干擾)' : ''} \${(comb as any).hasS1Drop ? '(有S1掉落)' : ''}\`}
                        </span>
                      )}`;

const targetNew = `                      ) : (() => {
                        const rawStr = \`RNG: \${selectedCombIndex === globalIdx && isManualEdited ? currentRngString : \`[\${(gameType.includes('waygame') || gameType.includes('megaway')) ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) : 0)].join(',') : comb.rng.join(',')}]\${gameType === 'linegame_gods' && isFreeGame ? ',\\t[2,10,0],' : (gameType === 'linegame_set2' && ((comb as any).classStr || combinedClassIdStr) ? \`,\\t\${((comb as any).classStr || combinedClassIdStr)},\` : '')}\`} \${comb.isInterfered ? '(有干擾)' : ''} \${(comb as any).hasS1Drop ? '(有S1掉落)' : ''}\`;
                        const parts = rawStr.split('\\t');
                        return (
                          <div className="flex flex-col w-full text-right gap-0.5">
                            <span className="truncate block leading-tight" title={rawStr}>{parts[0]}</span>
                            {parts[1] && (
                              <span className="truncate block opacity-80 text-[10.5px] leading-tight text-[#64ffda]" title={\`Classid: \${parts[1].trim().replace(/,$/, '')}\`}>
                                Classid: {parts[1].trim().replace(/,$/, '')}
                              </span>
                            )}
                          </div>
                        );
                      })()}`;

// We will replace it safely by formatting properly
content = content.replace(targetOld, targetNew);
// Fallback for CRLF
content = content.replace(targetOld.replace(/\n/g, '\r\n'), targetNew.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Visual button replaced");
