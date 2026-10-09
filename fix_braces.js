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
  // Match `newPayload: { id: ..., delta: { ... },`
  // and replace with `newPayload: { id: ..., delta: { ... } },`
  // since delta is on the same line.
  content = content.replace(/(newPayload:\s*\{\s*id:\s*[^,]+,\s*delta:\s*\{[^}]+\}),/g, '$1 },');
  fs.writeFileSync(p, content);
}
console.log('Fixed missing brace in 7 files');
