const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const oldUi = `          </div>\n          <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">\n            系統將會產出盡量在此轉輪表中符合條件的唯一最佳配置\n          </span>\n        </div>`;
const newUi = `          </div>\n          <div className="flex flex-col gap-2 items-end">\n            <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">\n              系統將會產出盡量在此轉輪表中符合條件的唯一最佳配置\n            </span>\n            {gameType === 'linegame_gods' && (\n              <button\n                onClick={() => setIsFreeGame(!isFreeGame)}\n                className={\`px-3 py-1.5 rounded text-xs font-bold transition-colors \${isFreeGame ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'}\`}\n              >\n                {isFreeGame ? 'FG 模式 (WY)' : 'BG 模式 (WX)'}\n              </button>\n            )}\n          </div>\n        </div>`;
content = content.replace(oldUi, newUi);

const oldCond1 = `                      .map(c => {\n                        let rngStr = '';\n                        if (gameType === 'linegame_set2') {`;
const newCond1 = `                      .map(c => {\n                        let rngStr = '';\n                        if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {`;
content = content.replace(oldCond1, newCond1);

const oldCond2 = `                        if (gameType === 'linegame_set2') {\n                          const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx`;
const newCond2 = `                        if (gameType === 'linegame_set2' || gameType === 'linegame_gods') {\n                          const mathIdsStr = isManualEdited && selectedCombIndex === globalIdx`;
content = content.replace(oldCond2, newCond2);

content = content.replace(
    'rngStr = classStr ? `${mathIdsStr}, ${classStr},` : `${mathIdsStr},`;',
    'rngStr = classStr ? `${mathIdsStr},\\t${classStr},` : `${mathIdsStr},`;'
);
content = content.replace(
    'const finalCopy = classStr ? `${mathIdsStr}, ${classStr},` : `${mathIdsStr},`;',
    'const finalCopy = classStr ? `${mathIdsStr},\\t${classStr},` : `${mathIdsStr},`;'
);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
