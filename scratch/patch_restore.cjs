const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf8');

const badCode = `                    if (parsed) {
                      setManualIndicesOther(parsed);
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}
                className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-1 outline-none focus:border-yellow-500 text-xs w-full placeholder:text-gray-600 font-mono"`;

const fixedCode = `            )}
          </div>
        </div>

        <div className="w-full max-w-3xl flex flex-col bg-[#0a192f] p-3 rounded-lg border border-gray-700/50 shadow-inner gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-700/50 pb-3 gap-3">
            <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
              <span className="text-sm text-dashboard-text-secondary font-bold pl-1">Reel Settings (單一連線測試)</span>
              <input
                type="text"
                placeholder="貼上 RNG 數組..."
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
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
                }}
                className="bg-[#112240] border border-gray-700 text-yellow-400 rounded px-2 py-1 outline-none focus:border-yellow-500 text-xs w-full placeholder:text-gray-600 font-mono"`;

if (code.includes(badCode)) {
    code = code.replace(badCode, fixedCode);
    console.log("Successfully restored and patched onChange!");
} else {
    console.log("Could not find the bad code to replace.");
}

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', code);
