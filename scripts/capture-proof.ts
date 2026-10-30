import { chromium } from "@playwright/test";
import path from "path";

async function captureProof() {
  console.log("=================================================================");
  console.log("📸 LAUNCHING PLAYWRIGHT BROWSER TO CAPTURE VISUAL PROOF");
  console.log("=================================================================\n");

  const artifactDir = "C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\308ae820-93c6-4338-8298-ecce97590e0a";
  const screenshotDesktopPath = path.join(artifactDir, "proof-live-map-desktop.png");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to login page: http://localhost:3000/");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  console.log("Logging in as staff@zerogroup.com...");
  await page.fill('input[name="email"]', "staff@zerogroup.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  console.log("Current URL after login:", page.url());

  console.log("Navigating directly to Unified Live Command Center: http://localhost:3000/staff/live/map");
  await page.goto("http://localhost:3000/staff/live/map", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000); // Allow Leaflet map & SWR stream to mount

  // Check for key UI elements
  const pageTitle = await page.textContent("h1");
  console.log("Page Heading Found:", pageTitle?.trim());

  const liveBadge = await page.locator("text=Live Stream (5s Sync)").isVisible();
  console.log("Verified 'Live Stream (5s Sync)' Badge Visible:", liveBadge);

  const tripReplay = await page.locator("text=Trip Playback & Route Scrubber").isVisible();
  console.log("Verified 'Trip Playback & Route Scrubber' Visible:", tripReplay);

  const moreWorkBtn = await page.locator("text=+ More Work (Next Phase)").first().isVisible();
  console.log("Verified '+ More Work (Next Phase)' Permanent Site Button Visible:", moreWorkBtn);

  // Take full desktop screenshot
  await page.screenshot({ path: screenshotDesktopPath, fullPage: true });
  console.log(`\n📸 Full Desktop Screenshot captured and saved to: ${screenshotDesktopPath}`);

  await browser.close();
  console.log("\n✅ [SUCCESS] Visual proof successfully captured!");
}

captureProof()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Screenshot capture failed:", err);
    process.exit(1);
  });
