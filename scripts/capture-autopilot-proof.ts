import { chromium } from "@playwright/test";
import path from "path";

async function captureAutopilotProof() {
  console.log("=================================================================");
  console.log("📸 CAPTURING VISUAL PROOF FOR ZERO-CLICK DRIVER AUTOPILOT");
  console.log("=================================================================\n");

  const artifactDir = "C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\308ae820-93c6-4338-8298-ecce97590e0a";
  const driverAutopilotPath = path.join(artifactDir, "proof-driver-autopilot-screen.png");
  const staffCommandPath = path.join(artifactDir, "proof-staff-command-locked.png");

  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // 1. Mobile Driver Session
  const driverContext = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 Mobile viewport
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const driverPage = await driverContext.newPage();

  console.log("1. Navigating to login for Driver...");
  await driverPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await driverPage.fill('input[name="email"]', "driver@zerogroup.com");
  await driverPage.fill('input[name="password"]', "password123");
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});

  console.log("2. Navigating to Driver Home: http://localhost:3000/driver/home");
  await driverPage.goto("http://localhost:3000/driver/home", { waitUntil: "networkidle" });
  await driverPage.waitForTimeout(2000);

  // Verify key elements
  const radarVisible = await driverPage.locator("text=GPS AUTO-TRACKING ACTIVE").isVisible();
  console.log("   - Radar Badge Visible:", radarVisible);
  const voiceNavVisible = await driverPage.locator("text=TAP FOR VOICE NAVIGATION").isVisible();
  console.log("   - Giant Voice Nav Button Visible:", voiceNavVisible);

  await driverPage.screenshot({ path: driverAutopilotPath });
  console.log(`📸 Senior Driver Autopilot Screenshot saved to: ${driverAutopilotPath}`);

  // 2. Staff Desktop Session
  const staffContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const staffPage = await staffContext.newPage();

  console.log("\n3. Navigating to login for Staff...");
  await staffPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await staffPage.fill('input[name="email"]', "staff@zerogroup.com");
  await staffPage.fill('input[name="password"]', "password123");
  await staffPage.click('button[type="submit"]');
  await staffPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});

  console.log("4. Navigating to Staff Live Map: http://localhost:3000/staff/live/map");
  await staffPage.goto("http://localhost:3000/staff/live/map", { waitUntil: "networkidle" });
  await staffPage.waitForTimeout(3000);

  const workTimerVisible = await staffPage.locator("text=Work Timer:").first().isVisible();
  console.log("   - Work Timer Badge on Card Visible:", workTimerVisible);

  await staffPage.screenshot({ path: staffCommandPath, fullPage: true });
  console.log(`📸 Staff Command Center Screenshot saved to: ${staffCommandPath}`);

  await browser.close();
  console.log("\n🎉 [SUCCESS] All Autopilot visual proofs captured!");
}

captureAutopilotProof()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Capture failed:", err);
    process.exit(1);
  });
