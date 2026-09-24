const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const targetOld = `                      <div className="flex items-center gap-1 w-full justify-between">
                        <code className="text-xs text-yellow-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={currentRngString}>
                          {currentRngString}
                        </code>`;

const targetNew = `                      <div className="flex items-center gap-1 w-full justify-between">
                        <code className="text-xs text-yellow-400 font-mono truncate max-w-[150px] sm:max-w-[300px]" title={currentRngString}>
                          {(() => {
                            const parts = currentRngString.split('\\t');
                            return (
                              <div className="flex flex-col">
                                <span>{parts[0]}</span>
                                {parts[1] && <span className="text-[10.5px] opacity-80 text-[#64ffda] leading-tight mt-0.5">Classid: {parts[1].trim().replace(/,$/, '')}</span>}
                              </div>
                            );
                          })()}
                        </code>`;

content = content.replace(targetOld, targetNew);
content = content.replace(targetOld.replace(/\n/g, '\r\n'), targetNew.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
console.log("Main visual replaced");
