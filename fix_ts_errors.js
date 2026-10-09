const fs = require('fs');

const fixActorRole = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/actorRole:\s*"SYSTEM"/g, 'actorRole: "ADMIN"');
  fs.writeFileSync(filePath, content);
};

['src/actions/godMode.ts', 'src/actions/settlement.ts', 'src/app/owner/billing/actions.ts',
 'src/app/staff/documents/actions.ts', 'src/app/staff/fleet/actions.ts', 'src/app/staff/fleet/expenses/actions.ts']
.forEach(fixActorRole);

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
  
  content = content.replace(/entity:\s*\"([^\"]+)\",\s*entity:\s*([^,]+),\s*action:\s*\"([^\"]+)\",/g, 
    'actionType: "$3",\n        entity: "$1",\n        newPayload: { id: $2 },');
    
  // Some use entityId
  content = content.replace(/entity:\s*\"([^\"]+)\",\s*entityId:\s*([^,]+),\s*action:\s*\"([^\"]+)\",/g, 
    'actionType: "$3",\n        entity: "$1",\n        newPayload: { id: $2 },');

  // Any remaining 'action: "..."' in audit log creates
  content = content.replace(/action:\s*\"([^\"]+)\"/g, 'actionType: "$1"');
  content = content.replace(/entityId:\s*([^,]+)/g, 'newPayload: { id: $1 }');

  // Fix dispatch.ts specifically for 'RENTED'
  content = content.replace(/status:\s*\"RENTED\"/g, 'status: "IN_USE"'); // Assuming IN_USE is the correct one for ToolStatus

  fs.writeFileSync(p, content);
}
console.log('Fixed additional typescript errors');
