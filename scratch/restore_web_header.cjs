const fs = require('fs');

let content = fs.readFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', 'utf8');

// 1. Precise Header Replacement for Web
const headerStart = content.indexOf('<div className="flex items-center gap-3">');
if (headerStart !== -1) {
  const headerEnd = content.indexOf('</div>', headerStart) + 6;
  const header = content.substring(headerStart, headerEnd);
  
  if (header.includes('Jira CSV 報表轉換器(WEB)')) {
    const replacement = `<div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-4">
              Jira CSV 報表轉換器
              <div className="flex items-center bg-[#0a192f] p-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => useMachineStore.getState().setActiveModalTool('jiraReport')}
                  className="px-4 py-1 rounded text-gray-400 hover:text-white text-sm font-bold transition-colors"
                >
                  機台
                </button>
                <button 
                  className="px-4 py-1 rounded bg-blue-500 text-white text-sm font-bold shadow-sm"
                >
                  WEB
                </button>
              </div>
            </h2>
          </div>`;
          
    content = content.replace(header, replacement);
    fs.writeFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', content, 'utf8');
    console.log("Replaced web header successfully!");
  }
}
