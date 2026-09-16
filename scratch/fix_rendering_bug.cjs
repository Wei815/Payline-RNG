const fs = require('fs');

function fixProjectsToRender(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the rendering logic inside the modal (around line 790 in both files)
  const target = `const projectsToRender = selectedProjectDetails === 'ALL' 
                    ? Object.keys(jiraIssues`;
  const target2 = `const projectsToRender = selectedProjectDetails === 'ALL' 
                  ? Object.keys(jiraIssues`;
                  
  const replacementTarget = `const projectsToRender = selectedProjectDetails === 'ALL' 
                    ? projectsFilter 
                    : [selectedProjectDetails];`;

  // We find the block starting with "const renderedProjects = projectsToRender.map("
  // and go backwards to find projectsToRender
  const mapIndex = content.indexOf('const renderedProjects = projectsToRender.map(');
  if (mapIndex !== -1) {
    const blockStart = content.lastIndexOf('const projectsToRender =', mapIndex);
    if (blockStart !== -1) {
      const blockEnd = content.indexOf(';', blockStart) + 1;
      const block = content.substring(blockStart, blockEnd);
      content = content.replace(block, replacementTarget);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed', file);
    }
  }
}

fixProjectsToRender('src/components/tools/JiraReportGenerator.tsx');
fixProjectsToRender('src/components/tools/JiraReportGeneratorWeb.tsx');
