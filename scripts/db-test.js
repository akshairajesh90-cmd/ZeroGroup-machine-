const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.test' });

const testUrl = process.env.DATABASE_URL || "postgresql://postgres:Akshai%402005@localhost:5432/project7_test?schema=public";
let cmd = process.argv.slice(2).join(' ');
if (!cmd) {
  console.error('Usage: node scripts/db-test.js <command>');
  process.exit(1);
}

if (cmd.includes('prisma db push')) {
  cmd = `${cmd} --url "${testUrl}"`;
}

console.log(`Running in test database environment (project7_test): ${cmd}`);
try {
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: testUrl } });
} catch (err) {
  process.exit(err.status || 1);
}
