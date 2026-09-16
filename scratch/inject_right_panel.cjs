const fs = require('fs');
let content = fs.readFileSync('src/components/tools/RngValidator.tsx', 'utf8');

// 1. Add Bookmark icon and Snippet Store
content = content.replace(
  "import { X, Play, AlertCircle, Square } from 'lucide-react';",
  "import { X, Play, AlertCircle, Square, Bookmark } from 'lucide-react';"
);
content = content.replace(
  "import { useMachineStore } from '../../store/useMachineStore';",
  "import { useMachineStore } from '../../store/useMachineStore';\nimport { useSnippetStore } from '../../store/useSnippetStore';"
);

// 2. Add snippets and formatting functions inside the component
const hooksInjection = `
  const snippets = useSnippetStore(state => state.snippets);
  const projectSnippets = snippets.filter(s => (s.projectName || s.gameType) === projectName);

  const format2DArray = (arr: number[][]) => {
    if (!arr || arr.length === 0) return '[]';
    return \`[\\n\${arr.map(subArr => \`[\${subArr.join(',')}]\`).join(',\\n')}\\n]\`;
  };

  const stringifyQA = (qaData: any) => {
    if (!qaData.QA || qaData.QA.length === 0) return JSON.stringify(qaData, null, 2);
    const qa = qaData.QA[0];
    return \`{
 "QA":[
 {
 "RNGs":
\${format2DArray(qa.RNGs)},
 "ClassIDs":
\${format2DArray(qa.ClassIDs)},
 "LuckySelects":
\${format2DArray(qa.LuckySelects)},
 "Selection":
\${format2DArray(qa.Selection)}
 }
 ]
}\`;
  };
`;

content = content.replace(
  'const { isProjectLoaded, projectName, gameType, gameConfig, isProjectLoading } = useGameStore();',
  'const { isProjectLoaded, projectName, gameType, gameConfig, isProjectLoading } = useGameStore();\n' + hooksInjection
);

// 3. Add the Far Right Panel
const rightPanelJSX = `
          {/* Far Right Panel: Saved Scripts */}
          {isProjectLoaded && (
            <div className="w-[300px] border-l border-gray-700/50 flex flex-col bg-[#0a192f] shrink-0">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="text-sm font-bold text-[#e6f1ff] flex items-center gap-2">
                  <Bookmark size={18} className="text-dashboard-accent" />
                  已儲存腳本
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  點擊快速載入腳本內容至左側
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                {projectSnippets.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    目前專案沒有儲存的腳本
                  </div>
                ) : (
                  projectSnippets.map(snippet => (
                    <button
                      key={snippet.id}
                      onClick={() => setJsonInput(stringifyQA(snippet.content))}
                      className="text-left bg-[#112240] hover:bg-[#152e4b] border border-gray-700 hover:border-dashboard-accent rounded-lg p-3 transition-colors flex flex-col gap-2 shadow-sm"
                    >
                      <div className="text-sm font-bold text-blue-300 w-full whitespace-normal break-words leading-tight">
                        {snippet.title}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-3 font-mono leading-tight">
                        {JSON.stringify(snippet.content).substring(0, 150)}...
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
`;

content = content.replace(
  '          </div>\n\n        </div>',
  '          </div>\n' + rightPanelJSX + '\n        </div>'
);

fs.writeFileSync('src/components/tools/RngValidator.tsx', content, 'utf8');
