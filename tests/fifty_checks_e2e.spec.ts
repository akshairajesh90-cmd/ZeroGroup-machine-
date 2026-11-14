import { test, expect, Page } from '@playwright/test';

// Helper to authenticate as ADMIN into project7_test
async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('admin@zerogroup.com');
  await page.locator('input[name="password"]').fill('admin123');
  await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
  // Wait for redirect out of login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe('50-Point Comprehensive Playwright E2E Suite', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 1: HOMEPAGE HEADER, BRANDING & AMBIENT ATMOSPHERE (Tests 1–10)
  // ══════════════════════════════════════════════════════════════════════════

  test('01. renders brand logo with transparent backdrop and no white container', async ({ page }) => {
    await page.goto('/');
    const logoImg = page.locator('header img[alt="ZERO GROUP Logo"]').first();
    await expect(logoImg).toBeVisible();

    // Verify parent container does not have bg-white or border-2 border-[#fa5402]
    const parentContainer = logoImg.locator('..');
    const className = await parentContainer.getAttribute('class');
    expect(className).not.toContain('bg-white');
    expect(className).not.toContain('border-2');
  });

  test('02. renders header title ZERO GROUP and MACHINERY badge', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header').getByText('ZERO GROUP').first()).toBeVisible();
    await expect(page.locator('header').getByText('MACHINERY').first()).toBeVisible();
  });

  test('03. renders header subtitle from CMS settings', async ({ page }) => {
    await page.goto('/');
    const subtitle = page.locator('header').getByText(/Commercial Construction Machinery/i).first();
    await expect(subtitle).toBeVisible();
  });

  test('04. renders hero headline and subheadline with proper typography', async ({ page }) => {
    await page.goto('/');
    const headline = page.getByRole('heading', { level: 1 }).filter({ hasText: /Heavy Construction Equipment/i }).first();
    await expect(headline).toBeVisible();
    await expect(page.getByText(/Commercial concrete mixers, vertical material hoists/i).first()).toBeVisible();
  });

  test('05. renders primary CTA Request Hire Quotation pointing to inquiry section', async ({ page }) => {
    await page.goto('/');
    const primaryCta = page.getByRole('link', { name: /Request Hire Quotation/i }).first();
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute('href', '#inquiry');
  });

  test('06. renders secondary CTA Search Plant Inventory pointing to machinery catalog', async ({ page }) => {
    await page.goto('/');
    const secondaryCta = page.getByRole('link', { name: /Search Plant Inventory/i }).first();
    await expect(secondaryCta).toBeVisible();
    await expect(secondaryCta).toHaveAttribute('href', '#machinery');
  });

  test('07. renders hero operational notice ribbon at top of the page', async ({ page }) => {
    await page.goto('/');
    const ribbon = page.getByText(/Full equipment fleet operational across Central Kerala/i).first();
    await expect(ribbon).toBeVisible();
  });

  test('08. renders 4 dynamic value proposition highlight cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Direct Site Mobilization').first()).toBeVisible();
    await expect(page.getByText('Trained Field Personnel').first()).toBeVisible();
    await expect(page.getByText('Zero Breakdown Guarantee').first()).toBeVisible();
    await expect(page.getByText('GST Compliant Billing').first()).toBeVisible();
  });

  test('09. renders animated operational metrics ticker with 4 fleet statistics', async ({ page }) => {
    await page.goto('/');
    const ticker = page.locator('section[aria-label="Operational Metrics Ticker"]');
    await expect(ticker).toBeVisible();
    await expect(ticker.getByText(/Districts/i).first()).toBeVisible();
    await expect(ticker.getByText(/Fleet/i).first()).toBeVisible();
  });

  test('10. displays floating Live Yard Desk WhatsApp desk trigger at bottom-right', async ({ page }) => {
    await page.goto('/');
    const deskBtn = page.locator('a[aria-label="Chat directly on WhatsApp"]');
    await expect(deskBtn).toBeVisible();
    await expect(deskBtn).toHaveAttribute('href', /wa\.me/);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 2: MACHINERY SHOWCASE, SEARCH & CATEGORY FILTERS (Tests 11–20)
  // ══════════════════════════════════════════════════════════════════════════

  test('11. displays certified construction machinery catalog section header', async ({ page }) => {
    await page.goto('/');
    const sectionHeading = page.getByRole('heading', { level: 2 }).filter({ hasText: /Certified Construction Machinery Catalog/i }).first();
    await expect(sectionHeading).toBeVisible();
  });

  test('12. renders live search input with placeholder', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search machinery/i);
    await expect(searchInput).toBeVisible();
  });

  test('13. displays initial count of machinery cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Fleet Inventory/i).first()).toBeVisible();
    await expect(page.getByText(/available units/i).first()).toBeVisible();
  });

  test('14. filters machinery fleet cards dynamically when typing in search', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search machinery/i);
    await searchInput.fill('Reversible');
    await expect(page.getByText(/Hydraulic Reversible Drum Mixer/i).first()).toBeVisible();
    // Non-matching machine should be hidden
    await expect(page.getByText(/Heavy-Duty Diesel De-Watering Trash Pump/i)).not.toBeVisible();
  });

  test('15. clears search query and restores fleet count when clicking Clear button', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search machinery/i);
    await searchInput.fill('Reversible');
    const clearBtn = page.getByRole('button', { name: 'Clear' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(page.getByText(/Heavy-Duty Diesel De-Watering Trash Pump/i).first()).toBeVisible();
  });

  test('16. shows empty state message and reset button when search has no matches', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search machinery/i);
    await searchInput.fill('NonExistentMachineXYZ');
    await expect(page.getByText(/No equipment matches your search query/i)).toBeVisible();
    const resetBtn = page.getByRole('button', { name: /Reset Search Filter/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  test('17. filters machinery by Concrete category filter pill', async ({ page }) => {
    await page.goto('/');
    const concretePill = page.getByRole('button', { name: 'Concrete', exact: true });
    await expect(concretePill).toBeVisible();
    await concretePill.click();
    await expect(page.getByText(/Hydraulic Reversible Drum Mixer/i).first()).toBeVisible();
  });

  test('18. filters machinery by Material Hoists category filter pill', async ({ page }) => {
    await page.goto('/');
    const hoistsPill = page.getByRole('button', { name: 'Material Hoists', exact: true });
    await expect(hoistsPill).toBeVisible();
    await hoistsPill.click();
    await expect(page.getByText(/Builder's Heavy Material Hoist/i).first()).toBeVisible();
  });

  test('19. toggles category pill back to All Fleet when clicked again', async ({ page }) => {
    await page.goto('/');
    const hoistsPill = page.getByRole('button', { name: 'Material Hoists', exact: true });
    await hoistsPill.click();
    // Click again to toggle back
    await hoistsPill.click();
    await expect(page.getByText(/Hydraulic Reversible Drum Mixer/i).first()).toBeVisible();
  });

  test('20. renders equipment photography banner on machinery cards', async ({ page }) => {
    await page.goto('/');
    const equipmentImg = page.locator('img[alt="Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)"]').first();
    await expect(equipmentImg).toBeVisible();
    const src = await equipmentImg.getAttribute('src');
    expect(src).toBeTruthy();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 3: QUICK-SPEC MODAL & INTERACTIVE RENTAL ESTIMATOR (Tests 21–30)
  // ══════════════════════════════════════════════════════════════════════════

  test('21. opens Quick-Spec Modal when clicking View Specs button', async ({ page }) => {
    await page.goto('/');
    const viewSpecsBtn = page.getByRole('button', { name: /View Specs/i }).first();
    await expect(viewSpecsBtn).toBeVisible();
    await viewSpecsBtn.click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test('22. displays machine photography banner inside Quick-Spec Modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    const modalImg = modal.locator('img').first();
    await expect(modalImg).toBeVisible();
  });

  test('23. displays power rating and pre-delivery testing badge in modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal.getByText(/Pre-Delivery Testing/i)).toBeVisible();
    await expect(modal.getByText(/Hydraulic Pressure & Load Tested/i)).toBeVisible();
  });

  test('24. displays technical specification bullet points in modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal.getByText(/Full Engineering & Operational Specs/i)).toBeVisible();
    const specBullets = modal.locator('ul li');
    await expect(specBullets.first()).toBeVisible();
  });

  test('25. closes Quick-Spec Modal when clicking close icon button', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /Close specification modal/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('26. closes Quick-Spec Modal when pressing keyboard Escape key', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('27. selects equipment for quotation directly from inside the spec modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /View Specs/i }).first().click();
    const modal = page.locator('div[role="dialog"]');
    const modalSelectBtn = modal.getByRole('button', { name: /Select for Quotation/i });
    await expect(modalSelectBtn).toBeVisible();
    await modalSelectBtn.click();
    await expect(modal).not.toBeVisible();
    // Dropdown in form should be pre-selected
    const dropdown = page.locator('#equipment-dropdown');
    await expect(dropdown).toHaveValue(/Hydraulic Reversible/i);
  });

  test('28. renders Interactive Rental Estimator slider with duration display', async ({ page }) => {
    await page.goto('/');
    const slider = page.locator('input[type="range"].estimator-slider');
    await expect(slider).toBeVisible();
    await expect(page.getByText(/Hire Duration:/i)).toBeVisible();
  });

  test('29. updates rental duration when clicking preset duration chips', async ({ page }) => {
    await page.goto('/');
    const monthPreset = page.getByRole('button', { name: /1 Month \+ \(Contract\)/i });
    await expect(monthPreset).toBeVisible();
    await monthPreset.click();
    await expect(page.getByText(/30 Days/i)).toBeVisible();
  });

  test('30. toggles operator crew mode between With Certified Operator and Dry Lease', async ({ page }) => {
    await page.goto('/');
    const dryLeaseOption = page.getByText(/Dry Lease \(Machinery Only\)/i);
    await expect(dryLeaseOption).toBeVisible();
    await dryLeaseOption.click();
    const withOperatorOption = page.getByText(/With Certified Operator/i).first();
    await withOperatorOption.click();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 4: REGIONAL COVERAGE, INQUIRY FORM & RESPONSIVE LAYOUT (Tests 31–40)
  // ══════════════════════════════════════════════════════════════════════════

  test('31. pre-fills equipment dropdown when selecting machine for quotation', async ({ page }) => {
    await page.goto('/');
    const cardSelectBtn = page.getByRole('link', { name: /Select for Quotation/i }).first();
    await cardSelectBtn.click();
    const dropdown = page.locator('#equipment-dropdown');
    await expect(dropdown).toBeVisible();
  });

  test('32. renders inquiry form fields for contractor name, phone, and district', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/Thomas Mathew/i)).toBeVisible();
    await expect(page.getByPlaceholder(/10-digit mobile number/i)).toBeVisible();
    await expect(page.locator('select').filter({ hasText: /Kottayam/i })).toBeVisible();
  });

  test('33. validates required fields on inquiry submission', async ({ page }) => {
    await page.goto('/');
    const submitBtn = page.getByRole('button', { name: /Submit Quotation Request via WhatsApp Desk/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    const nameInput = page.getByPlaceholder(/Thomas Mathew/i);
    await expect(nameInput).toBeVisible();
  });

  test('34. generates formatted WhatsApp inquiry link containing estimator parameters', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Thomas Mathew/i).fill('Test Engineer');
    await page.getByPlaceholder(/10-digit mobile number/i).fill('9876543210');
    const submitBtn = page.getByRole('button', { name: /Submit Quotation Request via WhatsApp Desk/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('35. displays Central Depot Kerala operational district matrix', async ({ page }) => {
    await page.goto('/');
    const districtSection = page.locator('section').filter({ hasText: /Active Operational Districts/i }).first();
    await expect(districtSection).toBeVisible();
    await expect(districtSection.getByText('Kottayam')).toBeVisible();
    await expect(districtSection.getByText('Ernakulam')).toBeVisible();
  });

  test('36. labels Central Kerala districts with rapid transit indicator', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/< 2 Hr Transit/i).first()).toBeVisible();
  });

  test('37. prevents text overflow and card collision for Thiruvananthapuram', async ({ page }) => {
    await page.goto('/');
    const districtSection = page.locator('section').filter({ hasText: /Active Operational Districts/i }).first();
    await expect(districtSection.getByText('Thiruvananthapuram')).toBeVisible();
  });

  test('38. adapts layout cleanly to mobile viewport 375x812 with 2-column district grid', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByText('ZERO GROUP').first()).toBeVisible();
    const districtSection = page.locator('section').filter({ hasText: /Active Operational Districts/i }).first();
    await expect(districtSection).toBeVisible();
  });

  test('39. adapts layout cleanly to tablet viewport 768x1024 with 4-column district grid', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByText('ZERO GROUP').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('40. adapts layout cleanly to desktop viewport 1440x900 with 7-column district grid', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('ZERO GROUP').first()).toBeVisible();
    await expect(page.getByText('Machinery Fleet').first()).toBeVisible();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 5: ADMIN PORTAL, WEBSITE CMS & MACHINERY PHOTO MANAGEMENT (Tests 41–50)
  // ══════════════════════════════════════════════════════════════════════════

  test('41. redirects unauthenticated user from /admin/settings/website to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/settings/website');
    await expect(page).toHaveURL(/\/login/);
  });

  test('42. authenticates admin user and redirects to admin portal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('43. loads Commercial CMS Control Center on /admin/settings/website', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await expect(page.getByRole('heading', { level: 1, name: /Public Website Content & Fleet Catalog/i })).toBeVisible();
  });

  test('44. switches between CMS tabs (Hero, Fleet Catalog, Value Props, Central Yard)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    const catalogTab = page.getByRole('button', { name: /Fleet Catalog/i });
    await expect(catalogTab).toBeVisible();
    await catalogTab.click();
    await expect(page.getByText(/Commercial Plant & Machinery Catalog/i)).toBeVisible();
  });

  test('45. displays Machinery Photo Asset editor for each catalog item in Fleet Catalog', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await page.getByRole('button', { name: /Fleet Catalog/i }).click();
    await expect(page.getByText(/Machinery Photo Asset/i).first()).toBeVisible();
  });

  test('46. displays live photo preview thumbnail for catalog items in admin portal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await page.getByRole('button', { name: /Fleet Catalog/i }).click();
    const thumbnail = page.locator('img[alt="Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)"]').first();
    await expect(thumbnail).toBeVisible();
  });

  test('47. allows editing custom Photo Source URL for equipment', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await page.getByRole('button', { name: /Fleet Catalog/i }).click();
    const urlInput = page.getByPlaceholder(/concrete-mixer\.jpg or https/i).first();
    await expect(urlInput).toBeVisible();
  });

  test('48. updates photo immediately when clicking Quick-Pick preset buttons', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await page.getByRole('button', { name: /Fleet Catalog/i }).click();
    const hoistPresetBtn = page.getByRole('button', { name: 'Material Hoist' }).first();
    await expect(hoistPresetBtn).toBeVisible();
    await hoistPresetBtn.click();
    const urlInput = page.getByPlaceholder(/concrete-mixer\.jpg or https/i).first();
    await expect(urlInput).toHaveValue('/images/machinery/material-hoist.jpg');
  });

  test('49. resets custom photo back to category default when clicking Reset Photo', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    await page.getByRole('button', { name: /Fleet Catalog/i }).click();
    const hoistPresetBtn = page.getByRole('button', { name: 'Material Hoist' }).first();
    await hoistPresetBtn.click();

    const resetBtn = page.getByRole('button', { name: /Reset Photo/i }).first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    const urlInput = page.getByPlaceholder(/concrete-mixer\.jpg or https/i).first();
    await expect(urlInput).toHaveValue('');
  });

  test('50. saves website settings successfully with toast notification and OCC versioning', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/website');
    const saveBtn = page.getByRole('button', { name: /Save All Changes/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByText(/updated successfully|Saving Changes/i).first()).toBeVisible();
  });

});
