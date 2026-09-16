const { execSync } = require('child_process');

try {
  // We only run on JiraReportGenerator.tsx since we restored it.
  // We modify the scripts to only process the first file or we just run them.
  // Actually, JiraReportGeneratorWeb.tsx is fine. Let's just restore BOTH, and run EVERYTHING again, 
  // ensuring a clean state!
  console.log("Restoring both files...");
  execSync('git restore src/components/tools/JiraReportGenerator.tsx src/components/tools/JiraReportGeneratorWeb.tsx');
  
  console.log("Running restore header properly...");
  execSync('node scratch/restore_header_properly.cjs');
  
  console.log("Running add project filter...");
  execSync('node scratch/add_project_filter.cjs');
  
  console.log("Running fix filter injection...");
  execSync('node scratch/fix_filter_injection.cjs');
  
  console.log("Running add project search...");
  execSync('node scratch/add_project_search.cjs');
  
  console.log("Running change filter to click...");
  execSync('node scratch/change_filter_to_click.cjs');
  
  console.log("Running fix rendering bug...");
  execSync('node scratch/fix_rendering_bug.cjs');
  
  console.log("ALL FIXES APPLIED SUCCESSFULLY.");
} catch (e) {
  console.error("Failed!", e.stdout ? e.stdout.toString() : e.message);
}
