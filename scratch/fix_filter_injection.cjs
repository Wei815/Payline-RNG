const fs = require('fs');

function fixFile(file, isWeb) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix state declaration
  if (!content.includes('const [projectsFilter')) {
     content = content.replace(
       "const [statusFilter, setStatusFilter] = useState('All');",
       "const [statusFilter, setStatusFilter] = useState('All');\n  const [projectsFilter, setProjectsFilter] = useState<string[]>([]);"
     );
  }

  // If web, fix jiraIssuesByProject references that were injected
  if (isWeb) {
     const filterUIStart = content.indexOf("{selectedProjectDetails === 'ALL' && (");
     if (filterUIStart !== -1) {
       const filterUIEnd = content.indexOf('</div>\n                    </div>\n                  )}', filterUIStart) + 55;
       const filterUI = content.substring(filterUIStart, filterUIEnd);
       const newFilterUI = filterUI.replace(/jiraIssuesByProject/g, 'jiraIssuesWebByProject');
       content = content.replace(filterUI, newFilterUI);
       
       // Fix the setProjectsFilter initial call
       content = content.replace(
         "setProjectsFilter(Object.keys(jiraIssuesByProject || {}) || []);",
         "setProjectsFilter(Object.keys(jiraIssuesWebByProject || {}) || []);"
       );
     }
  }

  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/components/tools/JiraReportGenerator.tsx', false);
fixFile('src/components/tools/JiraReportGeneratorWeb.tsx', true);
