const fs = require('fs');
let content = fs.readFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', 'utf8');

// Variable renames for WEB
content = content.replace(/JiraReportGenerator/g, 'JiraReportGeneratorWeb');
content = content.replace(/jiraReportData/g, 'jiraReportWebData');
content = content.replace(/setJiraReportData/g, 'setJiraReportWebData');
content = content.replace(/jiraReportFileName/g, 'jiraReportWebFileName');
content = content.replace(/setJiraReportFileName/g, 'setJiraReportWebFileName');
content = content.replace(/jiraIssuesByProject/g, 'jiraIssuesWebByProject');
content = content.replace(/setJiraIssuesByProject/g, 'setJiraIssuesWebByProject');
content = content.replace(/Jira CSV 報表轉換器\(機台\)/g, 'Jira CSV 報表轉換器(WEB)');

// Add hideEmpty toggle logic
content = content.replace(
  'const [copySuccess, setCopySuccess] = useState(false);',
  `const [copySuccess, setCopySuccess] = useState(false);\n  const [hideEmpty, setHideEmpty] = useState(true);\n  \n  const displayData = hideEmpty \n    ? (jiraReportWebData || []).filter(row => row.some((cell, idx) => idx > 0 && cell && cell.trim() !== '')) \n    : (jiraReportWebData || []);`
);

// Replace mappings
const mappingOut = fs.readFileSync('scratch/web_mapping_out.txt', 'utf8');
const startIdx = content.indexOf('const orderedProjects');
const endIdx = content.indexOf('const statusMap');
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + mappingOut + '\n' + content.substring(endIdx);
}

// Replace usage of data with displayData where necessary
content = content.replace(
  /if \(!jiraReportWebData \|\| !jiraReportWebData\.length\) return '';/g,
  "if (!displayData || !displayData.length) return '';"
);
content = content.replace(
  /\(jiraReportWebData \|\| \[\]\)\.forEach\(\s*row => \{/g,
  'displayData.forEach(row => {'
);
content = content.replace(
  /const safeData = jiraReportWebData \|\| \[\];/g,
  'const safeData = displayData || [];'
);

// UI mapping for empty state check
content = content.replace(
  /jiraReportWebData && jiraReportWebData\.length > 0/g,
  'displayData && displayData.length > 0'
);

// Disable properties
content = content.replace(
  /disabled=\{\!jiraReportWebData \|\| jiraReportWebData\.length === 0\}/g,
  'disabled={!displayData || displayData.length === 0}'
);

// The map render loop
content = content.replace(
  /\{\(jiraReportWebData \|\| \[\]\)\.map\(\(row/g,
  '{displayData.map((row'
);

// Add the toggle switch near the copy button
const toggleStr = `
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="w-4 h-4 rounded bg-[#0a192f] border-gray-600 text-blue-500" />
                  <span className="text-sm font-bold">隱藏無資料專案</span>
                </label>
`;
// Replace the button group start to insert the toggle
content = content.replace(
  /<div className="flex items-center gap-3">\s*<button\s*onClick=\{\(\) => \{\s*setSelectedProjectDetails/g,
  '<div className="flex items-center gap-3">' + toggleStr + '<button\n                  onClick={() => {\n                    setSelectedProjectDetails'
);

fs.writeFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', content, 'utf8');
