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
  
  // Some lines became:
  // newPayload: { id: invoice.id, delta:  { invoiceNumber, totalAmount, dispatchIds } as any,
  //   actorId: employeeId
  // They are missing the closing `}` for `newPayload`.
  // So we look for `newPayload: { ... ,` followed by `\s*actorId:` and ensure the payload is closed.

  content = content.replace(/(newPayload:\s*\{\s*id:\s*[^,]+,\s*delta:\s*[^,]+,\n\s*)(actorId:)/g, '$1},\n        $2');
  content = content.replace(/(newPayload:\s*\{\s*id:\s*[^,]+,\s*delta:\s*[^,]+)( as any)?,\n(\s*actorId:)/g, '$1$2 },\n$3');
  
  // also fix godMode which already got `}` but maybe not `as any`.
  // It's safer to just revert and do it right, or just fix the ones without matching braces.
  
  fs.writeFileSync(p, content);
}
console.log('Fixed braces step 2');
