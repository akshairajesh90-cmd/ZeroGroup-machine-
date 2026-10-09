const fs = require('fs');

const fixActorRole = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/entity:\s*"([^"]+)",(\s*)newPayload/g, 'entity: "$1",$2actorRole: "SYSTEM",$2newPayload');
  fs.writeFileSync(filePath, c);
};

['src/actions/employees.ts', 'src/actions/expenses.ts', 'src/actions/cash.ts', 'src/actions/adjustments.ts', 'src/actions/advances.ts', 'src/app/driver/portal/actions.ts'].forEach(f => {
  if (fs.existsSync(f)) fixActorRole(f);
});

let d = fs.readFileSync('src/actions/dispatch.ts', 'utf8').split('\n');
d[249] = d[249].replace(/status:\s*"RENTED"/, 'status: "IN_USE"');
d[714] = d[714].replace(/status:\s*"RENTED"/, 'status: "IN_USE"');
fs.writeFileSync('src/actions/dispatch.ts', d.join('\n'));

let p = fs.readFileSync('src/app/driver/portal/actions.ts', 'utf8');
p = p.replace(/newPayload:\s*\{\s*id:\s*([^\}]+)\s*\},\s*delta:\s*([^\}]+)\s*\}/g, 'newPayload: { id: $1, delta: $2 }');
fs.writeFileSync('src/app/driver/portal/actions.ts', p);

d = fs.readFileSync('src/actions/dispatch.ts', 'utf8');
d = d.replace(/newPayload:\s*\{\s*id:\s*targetDispatchId\s*\},\s*delta:\s*\{\s*oldStatus:\s*dispatch\.status,\s*newStatus:\s*"COMPLETED"\s*\}\s*as\s*any,/g, 'newPayload: { id: targetDispatchId, delta: { oldStatus: dispatch.status, newStatus: "COMPLETED" } as any },');
fs.writeFileSync('src/actions/dispatch.ts', d);

console.log('Fixed actorRole and ToolStatus');
