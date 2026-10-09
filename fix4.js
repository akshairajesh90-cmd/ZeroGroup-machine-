const fs = require('fs');

const fixActorRole = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/actorRole:\s*"SYSTEM"/g, 'actorRole: "ADMIN"');
  fs.writeFileSync(filePath, c);
};

['src/actions/employees.ts', 'src/actions/expenses.ts', 'src/actions/cash.ts', 'src/actions/adjustments.ts', 'src/actions/advances.ts', 'src/app/driver/portal/actions.ts'].forEach(f => {
  if (fs.existsSync(f)) fixActorRole(f);
});

let d = fs.readFileSync('src/actions/dispatch.ts', 'utf8').split('\n');
console.log('dispatch.ts 720-730');
console.log(d.slice(720, 730).join('\n'));

// also fix prisma seed error
let p = fs.readFileSync('prisma/seed.ts', 'utf8');
p = p.replace(/await prisma\.operatorDocket\./g, '// await prisma.operatorDocket.');
fs.writeFileSync('prisma/seed.ts', p);

// Fix delta missing in dispatch.ts 728
d = fs.readFileSync('src/actions/dispatch.ts', 'utf8');
d = d.replace(/newPayload:\s*\{\s*id:\s*targetDispatchId\s*\},\s*delta:\s*\{\s*oldStatus:\s*dispatch\.status,\s*newStatus:\s*"COMPLETED"\s*\}\s*as\s*any,/g, 'newPayload: { id: targetDispatchId, delta: { oldStatus: dispatch.status, newStatus: "COMPLETED" } as any },');
fs.writeFileSync('src/actions/dispatch.ts', d);
