const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) { 
      results.push(file);
    }
  });
  return results;
}
const files = walk('c:/Users/AKSHAI RAJESH/project/project7/src');
let changedCount = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  // Replace the specific broken className in AdminSidebar
  newContent = newContent.replace(/className=\{lex items-center gap-3 rounded-xl px-3 py-2\.5 text-sm font-medium transition-all \}/g, 'className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all`}');
  newContent = newContent.replace(/className=\{h-4 w-4 \}/g, 'className={`h-4 w-4`}');
  
  // Fix the specific ones in WorkersClientPage
  newContent = newContent.replace(/className=\{px-3 py-1\.5 rounded-lg text-xs font-bold border transition-colors \}/g, 'className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors`}');
  
  if (newContent !== content) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Fixed ' + f);
    changedCount++;
  }
});
console.log('Total Fixed ' + changedCount + ' files.');
