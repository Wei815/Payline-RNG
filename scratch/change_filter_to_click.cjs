const fs = require('fs');

function applyTo(file) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add state
  if (!content.includes('isProjectsFilterOpen')) {
    content = content.replace(
      "const [projectsSearchQuery, setProjectsSearchQuery] = useState('');",
      "const [projectsSearchQuery, setProjectsSearchQuery] = useState('');\n  const [isProjectsFilterOpen, setIsProjectsFilterOpen] = useState(false);"
    );
  }

  // 2. Replace the UI parts
  content = content.replace(
    '<div className="relative group">',
    '<div className="relative">'
  );
  
  content = content.replace(
    '<button className="bg-[#0a192f] text-sm text-yellow-300 border border-gray-600 rounded px-3 py-1 focus:outline-none hover:border-yellow-500 transition-colors">',
    '<button onClick={() => setIsProjectsFilterOpen(prev => !prev)} className="bg-[#0a192f] text-sm text-yellow-300 border border-gray-600 rounded px-3 py-1 focus:outline-none hover:border-yellow-500 transition-colors">'
  );
  
  content = content.replace(
    '<div className="absolute hidden group-hover:flex flex-col bg-[#0a192f] border border-gray-600 rounded-lg p-2 top-full left-0 mt-1 z-50 w-64 max-h-[400px] shadow-2xl">',
    '{isProjectsFilterOpen && (\n                      <div className="absolute flex flex-col bg-[#0a192f] border border-gray-600 rounded-lg p-2 top-full left-0 mt-1 z-50 w-64 max-h-[400px] shadow-2xl">'
  );

  // 3. Find the end of the dropdown and add )}
  const searchStr = '</div>\n                    </div>\n                  );})()}';
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, '</div>\n                      )}\n                    </div>\n                  );})()}');
  }

  fs.writeFileSync(file, content, 'utf8');
}

applyTo('src/components/tools/JiraReportGenerator.tsx');
applyTo('src/components/tools/JiraReportGeneratorWeb.tsx');
