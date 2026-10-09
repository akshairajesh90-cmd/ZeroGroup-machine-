const fs = require('fs');

const paths = [
  'src/actions/godMode.ts',
  'src/actions/settlement.ts',
  'src/app/driver/portal/actions.ts',
  'src/app/owner/billing/actions.ts',
  'src/app/staff/documents/actions.ts',
  'src/app/staff/fleet/actions.ts',
  'src/app/staff/fleet/expenses/actions.ts'
];

for (const p of paths) {
  let content = fs.readFileSync(p, 'utf8');

  // Fix the missing closing brace by looking for the line starting with newPayload
  // and the next line starting with actorId
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('newPayload:') && lines[i+1] && lines[i+1].includes('actorId:')) {
      if (!lines[i].trim().endsWith('},')) {
        // Find if it ends with `,`
        if (lines[i].endsWith(',')) {
          lines[i] = lines[i].slice(0, -1) + ' },';
        } else {
          lines[i] = lines[i] + ' },';
        }
      }
    }
  }
  
  fs.writeFileSync(p, lines.join('\n'));
}
console.log('Fixed missing brace using line array');
