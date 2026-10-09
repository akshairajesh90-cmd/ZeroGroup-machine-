const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactDir = path.join('C:', 'Users', 'AKSHAI RAJESH', '.gemini', 'antigravity', 'brain', '10af0972-150d-4cf5-a224-7ee800e54946', 'screenshots');

if (!fs.existsSync(artifactDir)){
    fs.mkdirSync(artifactDir, { recursive: true });
}

(async () => {
  // Use dummy IDs for dynamic routes to capture the layout/404 UI
  const mId = '1';
  const vId = '1';
  const dId = '1';

  const routes = {
    admin: [
      '/admin/adjustments',
      '/admin/advances',
      '/admin/allocation',
      '/admin/cash',
      '/admin/chat',
      '/admin/dashboard',
      '/admin/dispatch',
      '/admin/dispatch/new',
      '/admin/documents',
      '/admin/employees',
      '/admin/expenses',
      '/admin/expenses/new',
      '/admin/fleet',
      `/admin/fleet/machine/${mId}`,
      `/admin/fleet/vehicle/${vId}`,
      '/admin/live',
      '/admin/live/map',
      '/admin/maintenance',
      '/admin/settlements',
      '/admin/staff-log',
      '/admin/tools'
    ],
    staff: [
      '/staff/cash',
      '/staff/chat',
      '/staff/dashboard',
      '/staff/dispatch',
      '/staff/dispatch/new',
      '/staff/documents',
      '/staff/expenses',
      '/staff/expenses/new',
      '/staff/fleet',
      '/staff/live',
      '/staff/live/map',
      '/staff/tools'
    ],
    driver: [
      '/driver/cash',
      '/driver/chat',
      '/driver/dispatches',
      '/driver/expenses',
      '/driver/home',
      `/driver/orders/${dId}`,
      '/driver/pay',
      '/driver/portal'
    ],
    operator: [
      '/operator/equipment',
      '/operator/home',
      '/operator/pay',
      '/operator/scanner'
    ]
  };

  const browser = await chromium.launch();
  
  for (const role of Object.keys(routes)) {
    const context = await browser.newContext({
      storageState: path.join(__dirname, `playwright/.auth/${role}.json`)
    });
    
    for (const route of routes[role]) {
      const page = await context.newPage();
      console.log(`Navigating to ${route} as ${role}...`);
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(1000); // Wait for hydration
      
      let cleanRoute = route.split('/').join('-');
      cleanRoute = cleanRoute.replace(mId, 'id');
      
      const fileName = `${role}-${cleanRoute}.png`.replace('-.png', '.png').replace('^-', '');
      const filePath = path.join(artifactDir, fileName);
      
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved screenshot: ${fileName}`);
      await page.close();
    }
    
    await context.close();
  }
  
  await browser.close();
})();
