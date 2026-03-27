// @ts-nocheck
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

function saveQuota() {
  fs.writeFileSync('./quota.json', JSON.stringify({
    count: global.jobsAcceptedToday,
    date: global.lastResetDate
  }));
}

function checkOverlap(date, time) {
  if (!fs.existsSync('history.log')) return false;
  const logs = fs.readFileSync('history.log', 'utf8');
  const searchPattern = new RegExp(`✅.*Date: ${date} \\| Time: ${time}`, 'i');
  return searchPattern.test(logs);
}

const allowedZips = new Set(['60169', '60159', '60168', '60195', '60193', '60194', '60107', '60196', '60173', '60133', '60172', '60192', '60067', '60008', '60179', '60157', '60120', '60103', '60108', '60117', '60007', '60038', '60055', '60078', '60094', '60143', '60005', '60011', '60006', '60074', '60009', '60095', '60121', '60122', '60188', '60139', '60199', '60010', '60197', '60116', '60128', '60132', '60191', '60004', '60184', '60118', '60101', '60123', '60056', '60177', '60106', '60185', '60070', '60105', '60399', '60110', '60186', '60138', '60187', '60174', '60190', '60090', '60666', '60018', '60016', '60021', '60019', '60599', '60148', '60017', '60701', '60688', '60089', '60137', '60047', '60102', '60181', '60126', '60189', '60176', '60131', '60013', '60164', '60068', '60156', '60069', '60136', '60124', '60026', '60163', '60555', '60165', '60062', '60175', '60015', '60061', '60714', '60134', '60025', '60060', '60569', '60183', '60656', '60631', '60160', '60065', '60515', '60523', '60162', '60084', '60706', '60104', '60171', '60161', '60014', '60053', '60563', '60042', '60634', '60532', '60039', '60029', '60566', '60567', '60154', '60082', '60510', '60153', '60707', '60147', '60539', '60305', '60077', '60155', '60559', '60540', '60514', '60502', '60646', '60048', '60522', '60519', '60045', '60012', '60526', '60521', '60093', '60630', '60035', '60142', '60558', '60141', '60130', '60022', '60301', '60040', '60302', '60598', '60140', '60712', '60542', '60037', '60682', '60076', '60303', '60641', '60091', '60513', '60051', '60516', '60639', '60546', '60572', '60304', '60203', '60030', '60505', '60504', '60073', '60517', '60043', '60561', '60565', '60201', '60644', '60651', '60044', '60568', '60507', '60659', '60534', '60625', '60645', '60109', '60204', '60119', '60202', '60402', '60618', '60527', '60525', '60041', '60506', '60647', '60208', '60804', '60624', '60088', '60626', '60050', '60501', '60564', '60503', '60440', '60660', '60180', '60064', '60020', '60640', '60086', '60623', '60151', '60613', '60622', '60458', '60612', '60490', '60144', '60657', '60638']);

/**
 * Process job decision: scrape data, validate, accept/decline, screenshot, close browser.
 * @param {Function} logger - Logging utility
 * @param {Function} sendJobProof - Notification utility
 */
async function processJobDecision(logger, sendJobProof) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/root/.cache/puppeteer/chrome/linux-146.0.7680.66/chrome-linux64/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://trmservices.com/portal/login', { waitUntil: 'networkidle2' });

    // 1. Persistence & Login Check
    const isLoggedIn = await page.$('.logout-button, #dashboard-header').catch(() => null);
    if (!isLoggedIn) {
      logger('Attempting Login...');
      await page.type('input[name="username"]', process.env.TRM_USER || '');
      await page.type('input[name="password"]', process.env.TRM_PASS || '');
      await Promise.all([
        page.click('#login-btn'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
    }

    const text = (await page.evaluate(() => document.body.innerText.toLowerCase()));
    const isPmJob = /property management|pm/i.test(text);

    // Scrape data
    const zipMatch = text.match(/zip\s*(?:code)?\s*:\s*(\d{5})/i) || text.match(/\b\d{5}\b/);
    const scrapedZip = zipMatch ? zipMatch[0] : null;

    const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    const scrapedDate = dateMatch ? dateMatch[0] : 'Unknown Date';

    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    const scrapedTime = timeMatch ? timeMatch[0] : 'Unknown Time';

    const isCredit = text.includes('payment') && text.includes('credit');

    const appliancesList = /refrigerator|oven|washer|dryer|stovetop|range|cooktop|dishwasher|microwave/i;
    const appliancesMatch = text.match(appliancesList);
    const scrapedAppliances = appliancesMatch ? appliancesMatch[0] : null;

    // Filter logic
    let reason = '';
    if (!allowedZips.has(scrapedZip)) {
      reason = `Invalid Zip: ${scrapedZip || 'N/A'}`;
    } else if (!isCredit) {
      reason = `Payment is not Credit`;
    } else if (checkOverlap(scrapedDate, scrapedTime)) {
      reason = `Conflict: Slot already booked for ${scrapedDate} at ${scrapedTime}`;
    } else if (!appliancesMatch) {
      reason = `No matching appliances: ${scrapedAppliances || 'none'}`;
    } else if (!isPmJob && global.jobsAcceptedToday >= 4) { // Apply quota only for non-PM jobs
      reason = `Daily quota reached for non-PM jobs (${global.jobsAcceptedToday}/4)`;
    }

    if (reason) {
      logger(`❌ Job Skipped/Declined | Zip: ${scrapedZip} | Reason: ${reason}`);
      const declineSelectors = 'button:has-text("Decline"), .btn-danger, #decline-btn';
      const declineBtn = await page.waitForSelector(declineSelectors, { timeout: 10000, visible: true }).catch(() => null);
      if (declineBtn) {
        await declineBtn.click();
      }
    } else {
      const jobType = isPmJob ? 'PM' : 'Standard';
      logger(`✅ ${jobType} Job Accepted | Zip: ${scrapedZip} | Appliance: ${scrapedAppliances}`);

      const acceptSelectors = 'button:has-text("Accept"), button:has-text("Confirm"), .btn-success, #accept-btn';
      const acceptBtn = await page.waitForSelector(acceptSelectors, { timeout: 10000, visible: true }).catch(() => null);

      if (acceptBtn) {
        await acceptBtn.click();

        // Wait for success indicator or URL change
        const success = await page.waitForFunction(() =>
          document.body.innerText.toLowerCase().includes('success') ||
          document.querySelector('.alert-success') ||
          !window.location.href.includes('detail'),
          { timeout: 10000 }
        ).catch(() => null);

        if (success) {
          if (!isPmJob) {
            global.jobsAcceptedToday++;
            saveQuota();
          }
          logger(`✅ Confirmed ${jobType} Job | Date: ${scrapedDate} | Time: ${scrapedTime} | Total: ${global.jobsAcceptedToday}`);
          await new Promise(r => setTimeout(r, 3000));
          await page.screenshot({ path: 'proof.png', fullPage: true });
          await sendJobProof(scrapedZip, scrapedAppliances, `${scrapedDate} @ ${scrapedTime}`);
        }
      }
    }
  } catch (err) {
    logger(`💥 ProcessJobDecision error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  processJobDecision,
  allowedZips
};