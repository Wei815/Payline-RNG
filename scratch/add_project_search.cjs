const fs = require('fs');

function applyTo(file, isWeb) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add search query state
  if (!content.includes('projectsSearchQuery')) {
    content = content.replace(
      "const [projectsFilter, setProjectsFilter] = useState<string[]>([]);",
      "const [projectsFilter, setProjectsFilter] = useState<string[]>([]);\n  const [projectsSearchQuery, setProjectsSearchQuery] = useState('');"
    );
  }

  // 2. Locate filter UI
  const dataVar = isWeb ? 'jiraIssuesWebByProject' : 'jiraIssuesByProject';
  
  const filterUIStart = content.indexOf("{selectedProjectDetails === 'ALL' && (");
  if (filterUIStart !== -1) {
    const filterUIEnd = content.indexOf('</div>\n                    </div>\n                  )}', filterUIStart) + 55;
    const filterUI = content.substring(filterUIStart, filterUIEnd);
    
    // We want to replace the whole dropdown contents
    const replacementUI = `                  {selectedProjectDetails === 'ALL' && (() => {
                    const allProjects = Object.keys(${dataVar} || {});
                    const filteredProjects = allProjects.filter(p => p.toLowerCase().includes(projectsSearchQuery.toLowerCase()));
                    
                    return (
                    <div className="relative group">
                      <button className="bg-[#0a192f] text-sm text-yellow-300 border border-gray-600 rounded px-3 py-1 focus:outline-none hover:border-yellow-500 transition-colors">
                        篩選專案 ({projectsFilter.length})
                      </button>
                      <div className="absolute hidden group-hover:flex flex-col bg-[#0a192f] border border-gray-600 rounded-lg p-2 top-full left-0 mt-1 z-50 w-64 max-h-[400px] shadow-2xl">
                        <div className="flex justify-between items-center mb-2 px-2 pb-1 shrink-0">
                          <button onClick={() => setProjectsFilter(filteredProjects)} className="text-xs font-bold text-blue-400 hover:text-blue-300">全選</button>
                          <button onClick={() => setProjectsFilter([])} className="text-xs font-bold text-gray-400 hover:text-white">全不選</button>
                        </div>
                        <div className="px-2 pb-2 mb-2 border-b border-gray-700 shrink-0">
                          <input
                            type="text"
                            placeholder="🔍 搜尋專案名稱..."
                            value={projectsSearchQuery}
                            onChange={(e) => setProjectsSearchQuery(e.target.value)}
                            className="w-full bg-[#112240] border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 custom-scrollbar">
                          {filteredProjects.map(proj => (
                            <label key={proj} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#112240] rounded cursor-pointer text-sm text-gray-300 shrink-0">
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
                    </div>
                  );})()}`;
                  
    content = content.replace(filterUI, replacementUI);
  }

  fs.writeFileSync(file, content, 'utf8');
}

applyTo('src/components/tools/JiraReportGenerator.tsx', false);
applyTo('src/components/tools/JiraReportGeneratorWeb.tsx', true);
