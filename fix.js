const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');

  // Fix all lines that match: '        newPayload: { id: ..., delta: { ... } as any }' missing the comma
  lines = lines.map(line => {
    if (line.match(/newPayload: \{ id: [^,]+, delta: \{ .* \} as any \}\s*$/)) {
      return line.replace(/(\} as any \})\s*$/, '$1,');
    }
    return line;
  });

  // If there's duplicate "use server", remove the first block until the second one
  const firstUseServer = lines.findIndex(l => l.includes('"use server";'));
  const secondUseServer = lines.findIndex((l, i) => i > firstUseServer && l.includes('"use server";'));
  if (secondUseServer !== -1) {
    lines.splice(firstUseServer, secondUseServer - firstUseServer);
  }

  // Also fix lines like: 'newPayload: { id: targetEmployeeId , delta: { }'
  // by searching for them and manually correcting them. This was broken by regex.
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('newPayload: { id: targetEmployeeId , delta: { }')) {
      lines[i] = '        newPayload: { id: targetEmployeeId, delta: { previousRates, newRates } as any },';
      lines.splice(i+1, 3); // remove previousRates, newRates, etc.
    }
    
    // Fix missing commas if any other variants exist
    if (lines[i].includes('} as any,        actorId:')) {
      lines[i] = lines[i].replace('} as any,        actorId:', '} as any },\n        actorId:');
    }
  }

  // Write back
  fs.writeFileSync(filePath, lines.join('\n'));
}

fixFile('src/actions/employees.ts');
fixFile('src/actions/expenses.ts');

console.log('Fixed syntax using fix.js');
