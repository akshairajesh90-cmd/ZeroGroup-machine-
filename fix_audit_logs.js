const fs = require('fs');
const glob = require('glob');

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
  content = content.replace(/entity:\s*(\"[^\"]+\"),\s*entity:\s*([^,]+),\s*action:\s*(\"[^\"]+\"),\s*delta:/g, 'actionType: $3,\n      entity: $1,\n      actorRole: "SYSTEM",\n      newPayload: { id: $2, delta: ');
  fs.writeFileSync(p, content);
}
console.log('Fixed AuditLogs in 7 files');
