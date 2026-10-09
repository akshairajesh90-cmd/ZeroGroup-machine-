const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.fill('input[name="email"]', 'staff@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log("Current URL:", page.url());
  
  const errCount = await page.locator('.text-rose-400').count();
  if (errCount > 0) {
    const errorText = await page.locator('.text-rose-400').first().innerText();
    console.log("Error message on page:", errorText);
  } else {
    console.log("No error message on page.");
  }
  
  await browser.close();
})();
