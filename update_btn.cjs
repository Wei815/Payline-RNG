const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const oldUi = `            </select>
          </div>
          <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
            自動列出該符號在當前滾輪表之無干擾單一連線配置
          </span>
        </div>`;

const newUi = `            </select>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className="text-xs text-dashboard-text-secondary sm:text-right leading-relaxed">
              自動列出該符號在當前滾輪表之無干擾單一連線配置
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

// Try CRLF replacement
let content1 = content.split('\r\n').join('\n');
content1 = content1.replace(oldUi, newUi);
if (content1 !== content) {
    fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content1, 'utf-8');
    console.log("Replaced");
} else {
    console.log("Not found");
}
