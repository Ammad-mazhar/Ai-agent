// @ts-nocheck
const puppeteer = require('puppeteer');

/**
 * Placeholder AI function for page analysis and application logic.
 * Currently logs a message; extend later with real AI integration.
 * @param {import('puppeteer').Page} page - The Puppeteer page instance.
 * @returns {Promise<boolean>} Success flag.
 */
async function analyzePageAndApply(page) {
  const isValid = await validateJobData(page);
  if (!isValid) {
    return false;
  }

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
  // @ts-ignore
  if (!global.agentEnabled) {
    console.log('Agent is currently disabled by the user');
    return;
  }
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
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
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
    console.error('💥 Application process failed:', err instanceof Error ? err.message : String(err));
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed.');
    }
  }
}

/** @param {string} dateStringFromWeb */
function isDayAfterTomorrow(dateStringFromWeb) {
  const today = new Date();
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  // Format both to YYYY-MM-DD to compare easily
  const target = dayAfterTomorrow.toISOString().split('T')[0];
  const webDate = new Date(dateStringFromWeb).toISOString().split('T')[0];

  return target === webDate;
}

/** @param {import('puppeteer').Page} page */
async function validateJobData(page) {
  try {
    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();

    // Payment Type
    if (!text.includes('credit') || text.includes('cash') || text.includes('check')) {
      console.log('Failed: Invalid Payment Type');
      return false;
    }

    // Appliances
    const appliances = /refrigerator|oven|washer|dryer|stovetop|range|cooktop|dishwasher|microwave/i;
    if (!appliances.test(text)) {
      console.log('Failed: No required appliances found');
      return false;
    }

    // Schedule - day after tomorrow - find date string first
    const dateMatch = text.match(/\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|january|february|march|april|may|june|july|august|september|october|november|december/i);
    if (!dateMatch) {
      console.log('Failed: No date found');
      return false;
    }
    const dateStr = dateMatch[0];
    if (!isDayAfterTomorrow(dateStr)) {
      console.log(`Failed: Date ${dateStr} is not day after tomorrow`);
      return false;
    }

    // Zip Code
    const allowedZips = ['60169', '60159', '60168', '60195', '60193', '60194', '60107', '60196', '60173', '60133', '60172', '60192', '60067', '60008', '60179', '60157', '60120', '60103', '60108', '60117', '60007', '60038', '60055', '60078', '60094', '60143', '60005', '60011', '60006', '60074', '60009', '60095', '60121', '60122', '60188', '60139', '60199', '60010', '60197', '60116', '60128', '60132', '60191', '60004', '60184', '60118', '60101', '60123', '60056', '60177', '60106', '60185', '60070', '60105', '60399', '60110', '60186', '60138', '60187', '60174', '60190', '60090', '60666', '60018', '60016', '60021', '60019', '60599', '60148', '60017', '60701', '60688', '60089', '60137', '60047', '60102', '60181', '60126', '60189', '60176', '60131', '60013', '60164', '60068', '60156', '60069', '60136', '60124', '60026', '60163', '60555', '60165', '60062', '60175', '60015', '60061', '60714', '60134', '60025', '60060', '60569', '60183', '60656', '60631', '60160', '60065', '60515', '60523', '60162', '60084', '60706', '60104', '60171', '60161', '60014', '60053', '60563', '60042', '60634', '60532', '60039', '60029', '60566', '60567', '60154', '60082', '60510', '60153', '60707', '60147', '60539', '60305', '60077', '60155', '60559', '60540', '60514', '60502', '60646', '60048', '60522', '60519', '60045', '60012', '60526', '60521', '60093', '60630', '60035', '60142', '60558', '60141', '60130', '60022', '60301', '60040', '60302', '60598', '60140', '60712', '60542', '60037', '60682', '60076', '60303', '60641', '60091', '60513', '60051', '60516', '60639', '60546', '60572', '60304', '60203', '60030', '60505', '60504', '60073', '60517', '60043', '60561', '60565', '60201', '60644', '60651', '60044', '60568', '60507', '60659', '60534', '60625', '60645', '60109', '60204', '60119', '60202', '60402', '60618', '60527', '60525', '60041', '60506', '60647', '60208', '60804', '60624', '60088', '60626', '60050', '60501', '60564', '60503', '60440', '60660', '60180', '60064', '60020', '60640', '60086', '60623', '60151', '60613', '60622', '60458', '60612', '60490', '60144', '60657', '60638'];
    const zipMatch = text.match(/\b\d{5}\b/g);
    if (!zipMatch || !zipMatch.some((/** @type {string} */ zip) => allowedZips.includes(zip))) {
      console.log('Failed: Invalid Zip Code');
      return false;
    }

    console.log('✅ All validation criteria passed');
    return true;
  } catch (err) {
    console.log('Failed: Validation error', err instanceof Error ? err.message : String(err));
    return false;
  }
}

const allowedZips = new Set(['60169', '60159', '60168', '60195', '60193', '60194', '60107', '60196', '60173', '60133', '60172', '60192', '60067', '60008', '60179', '60157', '60120', '60103', '60108', '60117', '60007', '60038', '60055', '60078', '60094', '60143', '60005', '60011', '60006', '60074', '60009', '60095', '60121', '60122', '60188', '60139', '60199', '60010', '60197', '60116', '60128', '60132', '60191', '60004', '60184', '60118', '60101', '60123', '60056', '60177', '60106', '60185', '60070', '60105', '60399', '60110', '60186', '60138', '60187', '60174', '60190', '60090', '60666', '60018', '60016', '60021', '60019', '60599', '60148', '60017', '60701', '60688', '60089', '60137', '60047', '60102', '60181', '60126', '60189', '60176', '60131', '60013', '60164', '60068', '60156', '60069', '60136', '60124', '60026', '60163', '60555', '60165', '60062', '60175', '60015', '60061', '60714', '60134', '60025', '60060', '60569', '60183', '60656', '60631', '60160', '60065', '60515', '60523', '60162', '60084', '60706', '60104', '60171', '60161', '60014', '60053', '60563', '60042', '60634', '60532', '60039', '60029', '60566', '60567', '60154', '60082', '60510', '60153', '60707', '60147', '60539', '60305', '60077', '60155', '60559', '60540', '60514', '60502', '60646', '60048', '60522', '60519', '60045', '60012', '60526', '60521', '60093', '60630', '60035', '60142', '60558', '60141', '60130', '60022', '60301', '60040', '60302', '60598', '60140', '60712', '60542', '60037', '60682', '60076', '60303', '60641', '60091', '60513', '60051', '60516', '60639', '60546', '60572', '60304', '60203', '60030', '60505', '60504', '60073', '60517', '60043', '60561', '60565', '60201', '60644', '60651', '60044', '60568', '60507', '60659', '60534', '60625', '60645', '60109', '60204', '60119', '60202', '60402', '60618', '60527', '60525', '60041', '60506', '60647', '60208', '60804', '60624', '60088', '60626', '60050', '60501', '60564', '60503', '60440', '60660', '60180', '60064', '60020', '60640', '60086', '60623', '60151', '60613', '60622', '60458', '60612', '60490', '60144', '60657', '60638']);

/**
 * Process job decision: scrape data, validate, accept/decline, screenshot, close browser.
 * @param {import('puppeteer').Page} page 
 * @param {import('puppeteer').Browser} browser 
 */
async function processJobDecision(page, browser) {
  // @ts-ignore
  if (!global.agentEnabled) {
    console.log('Agent is currently disabled by the user');
    if (browser) await browser.close();
    return;
  }
  try {
    const text = (await page.evaluate(() => document.body.innerText.toLowerCase()));

    // Scrape data
    const zipMatch = text.match(/\b\d{5}\b/);
    const scrapedZip = zipMatch ? zipMatch[0] : null;

    const targetDate = new Date(Date.now() + 172800000).toLocaleDateString();
    const dateMatch = text.match(new RegExp(targetDate.replace(/ /g, '\\s+'), 'i'));
    const scrapedDate = dateMatch ? targetDate : null;

    const paymentMatch = text.match(/(credit|cash)/i);
    const scrapedPayment = paymentMatch ? paymentMatch[1] : null;

    const appliancesMatch = text.match(/refrigerator|oven|washer|dryer|stovetop|range|cooktop|dishwasher|microwave/i);
    const scrapedAppliances = appliancesMatch ? appliancesMatch[0] : null;

    console.log('Scraped:', { zip: scrapedZip, date: scrapedDate, payment: scrapedPayment, appliances: scrapedAppliances });

    // Filter logic
    let reason = '';
    if (!allowedZips.has(scrapedZip)) {
      reason = `Invalid Zip: ${scrapedZip}`;
    } else if (!text.includes('credit')) {
      reason = `Invalid Payment: ${scrapedPayment}`;
    } else if (!appliancesMatch) {
      reason = `No matching appliances: ${scrapedAppliances || 'none'}`;
    } else if (!dateMatch) {
      reason = `Invalid Date: expected ${targetDate}`;
    }

    if (reason) {
      console.log(`❌ Job Declined: ${reason}`);
      const declineSelectors = 'button.btn-danger, a.btn-danger, button[class*="decline"], a[class*="decline"], button[style*="red"], button[style*="#dc3545"], a[style*="red"], a[style*="#dc3545"], #decline';
      const declineBtn = await page.waitForSelector(declineSelectors, { timeout: 10000, visible: true }).catch(() => null);
      if (declineBtn) {
        await declineBtn.click();
        console.log('Red Decline button clicked');
      } else {
        console.log('Decline button not found');
      }
    } else {
      console.log('✅ Job Accepted');
      const acceptSelectors = 'button.btn-success, a.btn-success, button[class*="accept"], a[class*="accept"], button[style*="green"], button[style*="#28a745"], a[style*="green"], a[style*="#28a745"], #accept';
      const acceptBtn = await page.waitForSelector(acceptSelectors, { timeout: 10000, visible: true }).catch(() => null);
      if (acceptBtn) {
        await acceptBtn.click();
        console.log('✅ Light Green Accept button clicked - Job ACCEPTED');

        // Wait 3s and send proof
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'proof.png', fullPage: true });

        const nodemailer = require('nodemailer');
        const zip = scrapedZip || 'Unknown';
        const appliance = scrapedAppliances || 'Unknown';
        const date = scrapedDate || 'Unknown';

        const transporter = nodemailer.createTransporter({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'default@example.com',
            pass: process.env.EMAIL_PASS || ''
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'default@example.com',
          to: process.env.EMAIL_USER || 'default@example.com',
          subject: 'JOB ACCEPTED - Zip ' + zip + ' - ' + appliance,
          text: 'Accepted job:\\nZip: ' + zip + '\\nAppliance: ' + appliance + '\\nDate: ' + date + '\\nScreenshot: proof.png attached',
          attachments: [{
            filename: 'proof.png',
            path: './proof.png'
          }]
        });

        console.log('📧 Job proof emailed');
      } else {
        console.log('Accept button not found');
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'decision_proof.png', fullPage: true });
    console.log('📸 Decision proof saved');

  } catch (err) {
    console.error('ProcessJobDecision error:', err);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  applyToJob,
  analyzePageAndApply,
  validateJobData,
  processJobDecision,
  allowedZips
};



// Quick test: Uncomment and replace URL to test standalone.
// if (require.main === module) {
//   applyToJob('https://example.com/job-url');
// }