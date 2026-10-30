import { chromium } from "playwright";
import path from "path";

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log("Navigating to login page...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  console.log("Logging in as Driver (driver@zerogroup.com)...");
  await page.fill('input[name="email"]', "driver@zerogroup.com");
  await page.fill('input[name="password"]', "password123");
  
  await Promise.all([
    page.waitForURL((url) => url.pathname.includes("/driver") || url.pathname.includes("/redirecting"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  const artifactDir = "C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\ed665291-6c80-4996-a164-568d080cfcd8";

  // 1. Capture Driver Home Dashboard
  console.log("Capturing Driver Home POV...");
  await page.goto("http://localhost:3000/driver/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const homeShotPath = path.join(artifactDir, "proof_driver_home_mobile_chrome.png");
  await page.screenshot({ path: homeShotPath, fullPage: false });
  console.log("📸 Saved Driver Home POV to:", homeShotPath);

  // 2. Navigate to demo dispatch
  console.log("Navigating to demo dispatch: cmvpk9lvx0000jgvknu3urj7l");
  const targetUrl = "http://localhost:3000/driver/orders/cmvpk9lvx0000jgvknu3urj7l";
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  // 3. Capture Driver Order Viewport POV
  const driverScreenShotPath = path.join(artifactDir, "proof_driver_pov_mobile_chrome.png");
  await page.screenshot({ path: driverScreenShotPath, fullPage: false });
  console.log("📸 Saved Driver Mobile Order Screen POV to:", driverScreenShotPath);

  // 4. Scroll down to show GPS pinger console with bottom nav clearance
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const driverScrolledShotPath = path.join(artifactDir, "proof_driver_scrolled_chrome.png");
  await page.screenshot({ path: driverScrolledShotPath, fullPage: false });
  console.log("📸 Saved Driver Scrolled Pinger POV to:", driverScrolledShotPath);

  // 5. Scroll back up and click "Inspect GPS Pin" button to open modal
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  console.log("Clicking 'Inspect GPS Pin' button...");
  const pinBtn = page.locator('button:has-text("Inspect GPS Pin")').first();
  if (await pinBtn.isVisible()) {
    await pinBtn.click();
    await page.waitForTimeout(1000);

    const pinModalShotPath = path.join(artifactDir, "proof_driver_pin_modal_chrome.png");
    await page.screenshot({ path: pinModalShotPath, fullPage: false });
    console.log("📸 Saved Driver Pin Modal POV to:", pinModalShotPath);
  }

  await browser.close();
  console.log("✅ All Driver POV screenshots captured successfully in Chrome!");
}

main().catch((err) => {
  console.error("Driver POV Playwright Chrome error:", err);
  process.exit(1);
});
