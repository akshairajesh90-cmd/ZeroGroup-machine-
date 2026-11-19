import fs from 'fs';
import http from 'http';

function checkAuth(role: string, path: string) {
  const authPath = `playwright/.auth/${role}.json`;
  if (!fs.existsSync(authPath)) {
    console.error(`Auth file missing: ${authPath}`);
    return;
  }
  const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const cookieHeader = authData.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Benchmark-Agent/1.0',
    }
  };

  const req = http.request(options, (res) => {
    console.log(`[${role.toUpperCase()}] ${path} -> Status: ${res.statusCode}, Location: ${res.headers.location || 'none'}`);
    let len = 0;
    res.on('data', chunk => len += chunk.length);
    res.on('end', () => {
      console.log(`[${role.toUpperCase()}] Body length: ${len} bytes`);
    });
  });
  req.on('error', (err) => {
    console.error(`[${role.toUpperCase()}] Error:`, err.message);
  });
  req.end();
}

async function main() {
  checkAuth('admin', '/admin/dispatch-board');
  checkAuth('driver', '/driver/home');
  checkAuth('operator', '/operator/home');
  checkAuth('staff', '/staff/fleet');
}

main();
