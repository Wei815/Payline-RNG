const fs = require('fs');
let content = fs.readFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', 'utf8');

content = content.replace(
  'const [mrCopySuccess, setMrCopySuccess] = useState(false);',
  `const [mrCopySuccess, setMrCopySuccess] = useState(false);
  const [mrSearchQuery, setMrSearchQuery] = useState('');
  
  const filteredMrProjects = displayData.filter(row => 
    row[0].toLowerCase().includes(mrSearchQuery.toLowerCase())
  );`
);

content = content.replace(
  /onClick=\{\(\) => setMrSelectedProjects\(\(jiraReportWebData \|\| \[\]\)\.map\(r => r\[0\]\)\)\}/,
  'onClick={() => setMrSelectedProjects(filteredMrProjects.map(r => r[0]))}'
);

content = content.replace(
  /\{\(jiraReportWebData \|\| \[\]\)\.map\(row => \(/,
  '{filteredMrProjects.map(row => ('
);

const searchInputStr = `
                <div className="px-0 pb-2">
                  <input
                    type="text"
                    placeholder="🔍 搜尋專案名稱..."
                    value={mrSearchQuery}
                    onChange={(e) => setMrSearchQuery(e.target.value)}
                    className="w-full bg-[#112240] border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 shrink-0"
                  />
                </div>`;

content = content.replace(
  /<div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-2 min-h-0">/g,
  searchInputStr + '\n                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-2 min-h-0">'
);

fs.writeFileSync('src/components/tools/JiraReportGeneratorWeb.tsx', content, 'utf8');
