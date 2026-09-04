const fs = require('fs');
const raw = fs.readFileSync('scratch/mapping_data.txt', 'utf8');
const lines = raw.split('\n');
const orderedProjects = [];
const projectKeyMap = {};
let currentProject = '';
let currentJiraName = '';
for (let i = 1; i < lines.length; i++) {
  let line = lines[i].trim();
  if (!line) continue;
  if (line.includes('未開發完全')) continue;
  if (line.startsWith('https://')) {
    const urlMatch = line.match(/\/([A-Z0-9]+)"?$/);
    if (urlMatch) projectKeyMap[urlMatch[1]] = currentProject;
    continue;
  }
  if (line.startsWith('RSG.Web.')) {
     const parts = line.split('\t');
     const namePart = parts[0].replace(/"/g, '');
     if (parts.length > 1) {
         const urlStr = parts[1];
         const urlMatch = urlStr.match(/\/projects\/([A-Z0-9]+)\/issues/) || urlStr.match(/\/browse\/([A-Z0-9]+)/);
         if (urlMatch) {
             projectKeyMap[urlMatch[1]] = namePart + '\\n(' + currentProject.split('\\n(')[1];
         }
     }
     continue;
  }
  const parts = line.split('\t');
  if (parts.length < 3) continue;
  let chName = parts[0].trim();
  let jiraName = parts[1].trim().replace(/"/g, '');
  let urlStr = parts[2] ? parts[2].trim().replace(/"/g, '') : '';
  if (chName === 'trumpo') chName = 'Trumpo';
  if (chName === 'colorcircle') chName = 'ColorCircle';
  if (chName === 'Ninjaboy') chName = 'NinjaBoy';
  currentJiraName = jiraName;
  currentProject = jiraName + '\\n(' + chName + ')';
  if (!orderedProjects.includes(currentProject)) {
    orderedProjects.push(currentProject);
  }
  if (urlStr) {
      const urlMatch = urlStr.match(/\/projects\/([A-Z0-9]+)\/issues/) || urlStr.match(/\/browse\/([A-Z0-9]+)/);
      if (urlMatch) {
          projectKeyMap[urlMatch[1]] = currentProject;
      } else if (urlStr.includes('/issues')) {
          const m = urlStr.match(/\/projects\/([A-Z0-9]+)/);
          if (m) projectKeyMap[m[1]] = currentProject;
      }
  }
}
let out = 'const orderedProjects = [\n';
orderedProjects.forEach(p => {
    out += `  '${p}',\n`;
});
// Re-insert MahjongWays and RichMahjong2 correctly
out = out.replace(
  "'RSG.Web.Slot.MahjongWays2\\n(麻將發了2)',\\n",
  "'RSG.Web.Slot.MahjongWays\\n(麻將發了)',\\n  'RSG.Web.Slot.MahjongWays2\\n(麻將發了2)',\\n  'RSG.Web.Slot.RichMahjong2\\n(麻將發了2)',\\n"
);
out += '];\n\nconst projectKeyMap: Record<string, string> = {\n';
for (let [k, v] of Object.entries(projectKeyMap)) {
    out += `  '${k}': '${v}',\n`;
}
out += "  'RWSR': 'RSG.Web.Slot.RichMahjong2\\n(麻將發了2)',\n";
out += '};\n';
fs.writeFileSync('scratch/web_mapping_out.txt', out, 'utf8');
