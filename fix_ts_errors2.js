const fs = require('fs');

const pathsWithActionAndEntityId = [
  'src/actions/adjustments.ts',
  'src/actions/advances.ts',
  'src/actions/cash.ts',
  'src/actions/employees.ts',
  'src/actions/expenses.ts',
  'src/app/driver/portal/actions.ts',
  'src/actions/dispatch.ts'
];

for (const p of pathsWithActionAndEntityId) {
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  // merge newPayload id and delta
  content = content.replace(/newPayload:\s*\{\s*id:\s*([^}]+)\s*\},\s*delta:\s*([^\n]+)/g, 'newPayload: { id: $1, delta: $2 }');
  
  fs.writeFileSync(p, content);
}

// Revert IN_USE back to RENTED for MachineStatus in dispatch.ts
let dispatchContent = fs.readFileSync('src/actions/dispatch.ts', 'utf8');
dispatchContent = dispatchContent.replace(/status:\s*\"IN_USE\"/g, 'status: "RENTED"');
fs.writeFileSync('src/actions/dispatch.ts', dispatchContent);

// Fix prisma/seed.ts operatorDocket error
let seedContent = fs.readFileSync('prisma/seed.ts', 'utf8');
seedContent = seedContent.replace(/await prisma\.operatorDocket\./g, '// await prisma.operatorDocket.');
fs.writeFileSync('prisma/seed.ts', seedContent);

console.log('Fixed final delta errors');
