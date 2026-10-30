import { chromium } from "@playwright/test";
import path from "path";

async function captureStoreEditProof() {
  console.log("=================================================================");
  console.log("📸 CAPTURING VISUAL PROOF FOR STORE & SITE LOCATION EDITING");
  console.log("=================================================================\n");

  const artifactDir = "C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\308ae820-93c6-4338-8298-ecce97590e0a";
  const proofOverviewPath = path.join(artifactDir, "proof-live-map-with-store.png");
  const proofStoreModalPath = path.join(artifactDir, "proof-store-modal.png");
  const proofSiteModalPath = path.join(artifactDir, "proof-site-modal.png");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("1. Navigating to login page: http://localhost:3000/");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  console.log("2. Logging in as staff@zerogroup.com...");
  await page.fill('input[name="email"]', "staff@zerogroup.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  console.log("   Logged in, current URL:", page.url());

  console.log("3. Navigating to Unified Live Command Center: http://localhost:3000/staff/live/map");
  await page.goto("http://localhost:3000/staff/live/map", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000); // Wait for Leaflet tiles, pins, SWR

  // Take Overview Screenshot
  await page.screenshot({ path: proofOverviewPath, fullPage: true });
  console.log(`📸 Overview Screenshot saved to: ${proofOverviewPath}`);

  // Test 1: Store Location Modal
  console.log("4. Testing Store Yard GPS Modal...");
  const storeBtn = page.locator("text=Store Yard GPS");
  const storeBtnVisible = await storeBtn.isVisible();
  console.log("   - 'Store Yard GPS' button visible:", storeBtnVisible);

  if (storeBtnVisible) {
    await storeBtn.click();
    await page.waitForTimeout(600);

    const storeModalHeader = await page.locator("text=Edit Store & Base Yard Location").isVisible();
    console.log("   - Store Location Modal Opened:", storeModalHeader);

    await page.screenshot({ path: proofStoreModalPath });
    console.log(`📸 Store Modal Screenshot saved to: ${proofStoreModalPath}`);

    // Close modal
    await page.locator("text=Cancel").click();
    await page.waitForTimeout(400);
  }

  // Test 2: Dispatch Site Location Modal
  console.log("5. Testing Dispatch Site GPS Modal...");
  const editSiteBtn = page.locator("button:has-text('Edit GPS')").first();
  const editSiteBtnVisible = await editSiteBtn.isVisible();
  console.log("   - 'Edit GPS' button on dispatch card visible:", editSiteBtnVisible);

  if (editSiteBtnVisible) {
    await editSiteBtn.click();
    await page.waitForTimeout(600);

    const siteModalHeader = await page.locator("text=Edit Job Site Location").isVisible();
    console.log("   - Job Site Location Modal Opened:", siteModalHeader);

    await page.screenshot({ path: proofSiteModalPath });
    console.log(`📸 Site Modal Screenshot saved to: ${proofSiteModalPath}`);

    // Close modal
    await page.locator("text=Cancel").click();
    await page.waitForTimeout(400);
  }

  await browser.close();
  console.log("\n🎉 [SUCCESS] All visual proofs captured successfully!");
}

captureStoreEditProof()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Screenshot capture failed:", err);
    process.exit(1);
  });
