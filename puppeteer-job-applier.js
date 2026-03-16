const puppeteer = require('puppeteer');

/**
 * Placeholder AI function for page analysis and application logic.
 * Currently logs a message; extend later with real AI integration.
 * @param {puppeteer.Page} page - The Puppeteer page instance.
 * @returns {Promise<boolean>} Success flag.
 */
async function analyzePageAndApply(page) {
  console.log('Searching for Apply button...');
  // Future: Integrate AI for dynamic selector detection/form filling.
  return true;
}

/**
 * Main modular function to automate job application.
 * Handles full flow: launch, navigate, interact, screenshot, cleanup.
 * @param {string} jobUrl - The URL of the job listing.
 */
async function applyToJob(jobUrl) {
  let browser;
  try {
    console.log(`🚀 Starting job application for: ${jobUrl}`);

    // Launch with exact project-config matching specs (Linux/ deployment env).
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/root/.cache/puppeteer/chrome/linux-146.0.7680.66/chrome-linux64/chrome',
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(jobUrl, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded successfully.');

    // Call AI placeholder.
    const shouldProceed = await analyzePageAndApply(page);
    if (!shouldProceed) {
      console.log('❌ AI analysis decided not to proceed.');
      return;
    }

    // Common Apply button selectors (prioritized by likelihood/specificity).
    const applySelectors = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Easy Apply")',
      'a:has-text("Easy Apply")',
      '[data-automation-id="apply"]',
      '.apply-button',
      'button:contains("Apply")',
      '#apply-button',
      '[id*="apply"]',
      '.btn-primary:has-text("Apply")'
    ];

    // Search for first visible/enabled button.
    const applyButton = await page.waitForSelector(applySelectors.join(', '), { timeout: 10000 }).catch(() => null);
    if (!applyButton) {
      console.log('❌ No Apply button found with common selectors.');
      return;
    }

    console.log('✅ Apply button found. Clicking...');
    await applyButton.click();

    // Wait for post-click navigation/response.
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(err => {
      console.log('⚠️ Navigation timeout/failed (common for modals/forms), continuing...');
    });

    // Wait 5 seconds as specified.
    await page.waitForTimeout(5000);
    console.log('⏳ 5-second wait complete.');

    // Full-page screenshot as proof.
    await page.screenshot({ path: 'proof.png', fullPage: true });
    console.log('📸 Screenshot saved as proof.png');

    console.log('✅ Job application flow completed successfully!');

  } catch (err) {
    console.error('💥 Application process failed:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed.');
    }
  }
}

module.exports = {
  applyToJob,
  analyzePageAndApply
};

// Quick test: Uncomment and replace URL to test standalone.
// if (require.main === module) {
//   applyToJob('https://example.com/job-url');
// }

