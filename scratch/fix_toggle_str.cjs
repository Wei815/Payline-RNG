const fs = require('fs');
let content = fs.readFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', 'utf8');

const target = `<div className="flex items-center bg-[#0a192f] p-1 rounded-lg border border-gray-700">`;
const idx = content.indexOf(target);

if (idx !== -1) {
  const endIdx = content.indexOf('</div>', idx) + 6;
  const original = content.substring(idx, endIdx);
  
  const replacement = `<div className="flex items-center bg-[#0a192f] p-1 rounded-lg border border-gray-700">
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
              </div>`;
              
  content = content.replace(original, replacement);
  fs.writeFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', content, 'utf8');
  console.log("Successfully replaced!");
} else {
  console.log("Could not find target div.");
}
