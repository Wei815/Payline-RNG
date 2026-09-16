const fs = require('fs');

// 1. Add Toggle Header
let content = fs.readFileSync('src/components/tools/JiraReportGenerator.tsx', 'utf8');
const toggleTarget = `<div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Jira CSV 報表轉換器(機台)</h2>
          </div>`;
const toggleReplacement = `<div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-4">
              Jira CSV 報表轉換器
              <div className="flex items-center bg-[#0a192f] p-1 rounded-lg border border-gray-700">
                <button 
                  className="px-4 py-1 rounded bg-blue-500 text-white text-sm font-bold shadow-sm"
                >
                  機台
                </button>
                <button 
                  onClick={() => useMachineStore.getState().setActiveModalTool('jiraReportWeb')}
                  className="px-4 py-1 rounded text-gray-400 hover:text-white text-sm font-bold transition-colors"
                >
                  WEB
                </button>
              </div>
            </h2>
          </div>`;
if (content.includes('Jira CSV 報表轉換器(機台)')) {
    content = content.replace(toggleTarget, toggleReplacement);
    fs.writeFileSync('src/components/tools/JiraReportGenerator.tsx', content, 'utf8');
}
