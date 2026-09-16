const fs = require('fs');

function applyTo(file) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add state
  content = content.replace(
    "const [statusFilter, setStatusFilter] = useState<string>('All');",
    "const [statusFilter, setStatusFilter] = useState<string>('All');\n  const [projectsFilter, setProjectsFilter] = useState<string[]>([]);"
  );
  
  // 2. Update the button that opens the modal
  content = content.replace(
    /setSelectedProjectDetails\('ALL'\);\s*setReporterFilter\('All'\);\s*setAssigneeFilter\('All'\);\s*setStatusFilter\('All'\);/g,
    "setSelectedProjectDetails('ALL');\n                    setReporterFilter('All');\n                    setAssigneeFilter('All');\n                    setStatusFilter('All');\n                    setProjectsFilter(Object.keys(jiraIssuesByProject || {}) || []);"
  );

  // 3. Add the filter UI in the modal header
  const filterUI = `
                  {selectedProjectDetails === 'ALL' && (
                    <div className="relative group">
                      <button className="bg-[#0a192f] text-sm text-yellow-300 border border-gray-600 rounded px-3 py-1 focus:outline-none hover:border-yellow-500 transition-colors">
                        篩選專案 ({projectsFilter.length})
                      </button>
                      <div className="absolute hidden group-hover:flex flex-col bg-[#0a192f] border border-gray-600 rounded-lg p-2 top-full left-0 mt-1 z-50 w-64 max-h-[400px] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-2 px-2 border-b border-gray-700 pb-2">
                          <button onClick={() => setProjectsFilter(Object.keys(jiraIssuesByProject || {}))} className="text-xs font-bold text-blue-400 hover:text-blue-300">全選</button>
                          <button onClick={() => setProjectsFilter([])} className="text-xs font-bold text-gray-400 hover:text-white">全不選</button>
                        </div>
                        {Object.keys(jiraIssuesByProject || {}).map(proj => (
                          <label key={proj} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#112240] rounded cursor-pointer text-sm text-gray-300">
                            <input 
                              type="checkbox" 
                              checked={projectsFilter.includes(proj)} 
                              onChange={(e) => {
                                if (e.target.checked) setProjectsFilter(prev => [...prev, proj]);
                                else setProjectsFilter(prev => prev.filter(p => p !== proj));
                              }} 
                              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
                            />
                            <span className="truncate">{proj.split('\\n')[0]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}`;

  content = content.replace(
    /\{uniqueStatuses\.length > 0 && \(/,
    filterUI + '\n                  {uniqueStatuses.length > 0 && ('
  );

  // 4. Update the rendering logic inside the modal
  content = content.replace(
    /const projectsToRender = selectedProjectDetails === 'ALL'\s*\?\s*Object\.keys\(jiraIssuesByProject \|\| \{\}\)\s*:\s*\[selectedProjectDetails\];/,
    `const projectsToRender = selectedProjectDetails === 'ALL' 
                    ? projectsFilter 
                    : [selectedProjectDetails];`
  );

  fs.writeFileSync(file, content, 'utf8');
}

applyTo('src/components/tools/JiraReportGenerator.tsx');
applyTo('src/components/tools/JiraReportGeneratorWeb.tsx');
