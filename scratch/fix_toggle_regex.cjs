const fs = require('fs');
let content = fs.readFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', 'utf8');

const regex = /<button[^>]*>\s*機台\s*<\/button>\s*<button[^>]*>\s*WEB\s*<\/button>/g;
const replacement = `<button onClick={() => useMachineStore.getState().setActiveModalTool('jiraReport')} className="px-4 py-1 rounded text-gray-400 hover:text-white text-sm font-bold transition-colors">機台</button>
                <button className="px-4 py-1 rounded bg-blue-500 text-white text-sm font-bold shadow-sm">WEB</button>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', content, 'utf8');
