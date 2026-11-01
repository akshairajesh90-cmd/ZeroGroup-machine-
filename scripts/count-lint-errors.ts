import { execSync } from "child_process";
import fs from "fs";

try {
  execSync("npx next lint --format json > lint-output.json", { stdio: "inherit" });
} catch (e) {
  // lint exit code 1 when there are errors
}

if (fs.existsSync("lint-output.json")) {
  const raw = fs.readFileSync("lint-output.json", "utf-8");
  const jsonStart = raw.indexOf("[");
  const jsonEnd = raw.lastIndexOf("]");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const data = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    let errors = 0;
    let warnings = 0;
    data.forEach((f: any) => {
      errors += f.errorCount;
      warnings += f.warningCount;
    });
    console.log(`TOTAL_LINT_ERRORS: ${errors}`);
    console.log(`TOTAL_LINT_WARNINGS: ${warnings}`);
    console.log(`TOTAL_FILES_WITH_ISSUES: ${data.length}`);
  }
}
