const fs = require('fs');
const logFile = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\0785c266-a86c-4cf2-a5fd-2de9c711ef27\\.system_generated\\tasks\\task-794.log';
const log = fs.readFileSync(logFile, 'utf8');
const lines = log.split('\n');
let currentFile = null;
let filesToFix = {};

for (const line of lines) {
  if (line.startsWith('C:\\')) {
    currentFile = line.trim();
    if (!filesToFix[currentFile]) filesToFix[currentFile] = [];
  }
}

for (const file of Object.keys(filesToFix)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Revert what I changed
    content = content.replace(/: unknown\b/g, ': any').replace(/<unknown>/g, '<any>');
    fs.writeFileSync(file, content, 'utf8');
  }
}
console.log('Reverted unknown to any.');
