const fs = require('fs');
let lines = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8').split(/\r?\n/);

const newUi = `          <div className="flex flex-col gap-2 items-end">
            <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
              系統將會產出盡量在此轉輪表中符合條件的唯一最佳配置
            </span>
            {gameType === 'linegame_gods' && (
              <button
                onClick={() => setIsFreeGame(!isFreeGame)}
                className={\`px-3 py-1.5 rounded text-xs font-bold transition-colors \${isFreeGame ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'}\`}
              >
                {isFreeGame ? 'FG 模式 (WY)' : 'BG 模式 (WX)'}
              </button>
            )}
          </div>
        </div>`;

// Replace lines 733 to 736 (0-indexed: 733 to 736 means 4 lines)
lines.splice(733, 4, newUi);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', lines.join('\n'), 'utf-8');
