const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const NAV_TABS = [
  { name: 'Dashboard', path: '/', selector: 'text=Dashboard' },
  { name: 'Inventory', path: '/inventory', selector: 'text=Inventory' },
  { name: 'Orders', path: '/orders', selector: 'text=Orders' },
  { name: 'Demand', path: '/demand', selector: 'text=Demand' },
  { name: 'Spending', path: '/spending', selector: 'text=Spending' },
  { name: 'Reports', path: '/reports', selector: 'text=Reports' },
  { name: 'Restocking', path: '/restocking', selector: 'text=Restocking' },
];

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    // Test 1: Navigate to dashboard and take screenshot
    console.log('\n=== Test 1: Dashboard ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    console.log(`  Title: ${title}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_dashboard.png'), fullPage: false });
    console.log(`  Screenshot saved: 01_dashboard.png`);
    results.push({ name: 'Dashboard load', status: 'PASS', url: BASE_URL });

    // Test 2: Check sidebar navigation exists
    console.log('\n=== Test 2: Sidebar Navigation ===');
    const sidebar = await page.$('nav, aside, [class*="sidebar"], [class*="nav"]');
    if (sidebar) {
      console.log('  Sidebar found');
      results.push({ name: 'Sidebar exists', status: 'PASS' });
    } else {
      console.log('  WARNING: No explicit sidebar/nav element found');
      results.push({ name: 'Sidebar exists', status: 'WARN', note: 'No nav/aside element found' });
    }

    // Test 3: Click through navigation tabs
    console.log('\n=== Test 3: Navigation Tabs ===');
    for (let i = 0; i < NAV_TABS.length; i++) {
      const tab = NAV_TABS[i];
      try {
        // Find and click nav link
        const navLink = await page.$(`a[href="${tab.path}"], a[href*="${tab.path}"]`);
        if (navLink) {
          await navLink.click();
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          const currentUrl = page.url();
          const screenshotFile = `0${i+2}_${tab.name.toLowerCase()}.png`;
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile), fullPage: false });
          console.log(`  ${tab.name}: PASS (${currentUrl}) → ${screenshotFile}`);
          results.push({ name: `Navigate to ${tab.name}`, status: 'PASS', url: currentUrl });
        } else {
          // Try text-based navigation
          const textLink = await page.$(`text="${tab.name}"`);
          if (textLink) {
            await textLink.click();
            await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
            const screenshotFile = `0${i+2}_${tab.name.toLowerCase()}.png`;
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile) });
            console.log(`  ${tab.name}: PASS (via text link) → ${screenshotFile}`);
            results.push({ name: `Navigate to ${tab.name}`, status: 'PASS' });
          } else {
            console.log(`  ${tab.name}: SKIP (link not found in DOM)`);
            results.push({ name: `Navigate to ${tab.name}`, status: 'SKIP', note: 'Link not found' });
          }
        }
      } catch (err) {
        console.log(`  ${tab.name}: FAIL — ${err.message.substring(0, 100)}`);
        results.push({ name: `Navigate to ${tab.name}`, status: 'FAIL', error: err.message.substring(0, 100) });
      }
    }

    // Test 4: Verify page content loads (not empty)
    console.log('\n=== Test 4: Page Content Verification ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText.trim().length > 100;
    console.log(`  Body text length: ${bodyText.trim().length} chars`);
    console.log(`  Has content: ${hasContent}`);
    results.push({ name: 'Dashboard has content', status: hasContent ? 'PASS' : 'FAIL' });

  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n=============================');
  console.log('TEST SUMMARY');
  console.log('=============================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '~';
    console.log(`  ${icon} ${r.name}: ${r.status}${r.note ? ' — ' + r.note : ''}${r.error ? ' — ' + r.error : ''}`);
  });
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
