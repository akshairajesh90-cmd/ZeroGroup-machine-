const data = require('../route-inventory.json');

console.log(`| Route | Module | Page File | Imported Client Components | Modals | Form Elements |`);
console.log(`| :--- | :--- | :--- | :--- | :--- | :--- |`);

data.routes.forEach(r => {
  const comps = r.clientComponents.map(c => c.split('/').pop()).join(', ') || 'None';
  const mods = r.modals.join(', ') || 'None';
  console.log(`| \`${r.route}\` | **${r.module}** | \`${r.pageFile}\` | ${comps} | ${mods} | Buttons: ${r.buttons}, Inputs: ${r.inputs}, Selects: ${r.selects} |`);
});
