require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// --- 1. Global State ---
let jobsAcceptedToday = 0;
const rawStatus = (process.env.AGENT_STATUS || 'ON').trim().toUpperCase();
let isAgentEnabled = (rawStatus !== 'OFF');

const ALLOWED_ZIPS = new Set(["60169", "60159", "60168", "60195", "60193", "60194", "60107", "60196", "60173", "60133", "60172", "60192", "60067", "60008", "60179", "60157", "60120", "60103", "60108", "60117", "60007", "60038", "60055", "60078", "60094", "60143", "60005", "60011", "60006", "60074", "60009", "60095", "60121", "60122", "60188", "60139", "60199", "60010", "60197", "60116", "60128", "60132", "60191", "60004", "60184", "60118", "60101", "60123", "60056", "60177", "60106", "60185", "60070", "60105", "60399", "60110", "60186", "60138", "60187", "60174", "60190", "60090", "60666", "60018", "60016", "60021", "60019", "60599", "60148", "60017", "60701", "60688", "60089", "60137", "60047", "60102", "60181", "60126", "60189", "60176", "60131", "60013", "60164", "60068", "60156", "60169", "60136", "60124", "60026", "60163", "60555", "60165", "60062", "60175", "60015", "60061", "60714", "60134", "60025", "60060", "60569", "60183", "60656", "60631", "60160", "60065", "60515", "60523", "60162", "60084", "60706", "60104", "60171", "60161", "60014", "60053", "60563", "60042", "60634", "60532", "60039", "60029", "60566", "60567", "60154", "60082", "60510", "60153", "60707", "60147", "60539", "60305", "60077", "60155", "60559", "60540", "60514", "60502", "60646", "60048", "60522", "60519", "60045", "60012", "60526", "60521", "60093", "60630", "60035", "60142", "60558", "60141", "60130", "60022", "60301", "60040", "60302", "60598", "60140", "60712", "60542", "60037", "60682", "60076", "60303", "60641", "60091", "60513", "60051", "60516", "60639", "60546", "60572", "60304", "60203", "60030", "60505", "60504", "60073", "60517", "60043", "60561", "60565", "60201", "60644", "60651", "60044", "60568", "60507", "60659", "60534", "60625", "60645", "60109", "60204", "60119", "60202", "60402", "60618", "60527", "60525", "60041", "60506", "60647", "60208", "60804", "60624", "60088", "60626", "60050", "60501", "60564", "60503", "60440", "60660", "60180", "60064", "60020", "60640", "60086", "60623", "60151", "60613", "60622", "60458", "60612", "60490", "60144", "60657", "60638"]);
const ALLOWED_APPLIANCES = ["refrigerator", "oven", "washer", "dryer", "stovetop", "range", "cooktop", "dishwasher", "microwave"];

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

// --- 2. Send Notification with Screenshot ---
async function sendSystemAlert(subject, text, attachmentPath = null) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.CLIENT_RECEIVE_EMAIL,
    subject: subject,
    text: text
  };

  if (attachmentPath) {
    mailOptions.attachments = [{ filename: 'screenshot.png', path: attachmentPath }];
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Alert sent: ${subject}`);
  } catch (e) {
    console.error("❌ Email send failed:", e.message);
  }
}

// --- 3. Email Monitoring Bot ---
const imap = new Imap(imapConfig);

function startListening() {
  imap.once('ready', () => {
    console.log("✅ Bot ACTIVE: Monitoring emails from theappliancerepairmen.com...");
    console.log(`📊 Daily limit: 4 non-PM jobs | Status: ${isAgentEnabled ? 'ON' : 'OFF'}`);
    console.log(`📧 Monitoring: ${process.env.EMAIL_USER}`);
    console.log(`📨 Alerts to: ${process.env.CLIENT_RECEIVE_EMAIL}`);
    
    imap.openBox('INBOX', false, (err) => {
      if (err) throw err;
      
      // Heartbeat - keep connection alive
      setInterval(() => {
        imap.openBox('INBOX', false, () => {
          console.log('💓 Heartbeat: Connection alive');
        });
      }, 60000);
    });
  });

  imap.on('mail', () => {
    console.log('🔔 New email detected! Processing...');
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) return console.error('📬 Inbox error:', err.message);
      
      const f = imap.seq.fetch(box.messages.total + ':*', { bodies: '' });
      
      f.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return console.error('📧 Parse error:', err.message);
            
            const from = (parsed.from.text || "").toLowerCase();
            const subject = (parsed.subject || "").toUpperCase();
            const bossEmail = process.env.CLIENT_RECEIVE_EMAIL.toLowerCase();

            console.log(`\n📬 Email Details:`);
            console.log(`   From: ${from}`);
            console.log(`   Subject: ${subject}`);

            // --- REMOTE CONTROL: Listen for ON/OFF commands from your email ---
            if (from.includes(bossEmail)) {
              if (subject.includes("AGENT: OFF")) {
                isAgentEnabled = false;
                console.log("⏸️  Agent PAUSED via email command");
                return sendSystemAlert("⚠️ AGENT PAUSED", "Bot disabled via email");
              }
              if (subject.includes("AGENT: ON")) {
                isAgentEnabled = true;
                console.log("▶️  Agent RESUMED via email command");
                return sendSystemAlert("✅ AGENT ACTIVE", "Bot enabled via email");
              }
            }

            // Skip processing if agent is disabled
            if (!isAgentEnabled) {
              console.log('⏸️  Skipping (agent disabled)');
              return;
            }

            // Check if email is from TRM (theappliancerepairmen.com)
            if (!from.includes('theappliancerepairmen.com') && !from.includes('trm')) {
              console.log(`⏭️  Skipping (not from TRM): ${from}`);
              return;
            }

            console.log(`📨 ✅ TRM email detected from theappliancerepairmen.com! Processing job...`);

            const body = (parsed.text || "").toLowerCase();
            
            // DEBUG: Show first 500 chars of email body
            console.log(`\n📄 Email body preview:\n${body.substring(0, 500)}...\n`);
            
            // Extract data from email
            const zipMatch = body.match(/\b\d{5}\b/);
            const zip = zipMatch ? zipMatch[0] : null;
            const appliance = ALLOWED_APPLIANCES.find(a => body.includes(a));
            const isPM = body.includes('property management') || body.includes('pm');
            const links = parsed.text.match(/https?:\/\/[^\s]+/g) || [];
            const acceptUrl = links.find(l => l.toLowerCase().includes('accept') && !l.toLowerCase().includes('decline'));

            // DEBUG: Show all found links
            console.log(`\n🔗 Links found in email: ${links ? links.length : 0}`);
            if (links && links.length > 0) {
              links.forEach((link, i) => console.log(`   Link ${i + 1}: ${link}`));
            }

            console.log(`\n🔍 Validation Results:`);
            console.log(`   ZIP: ${zip} ${zip && ALLOWED_ZIPS.has(zip) ? '✅' : '❌'}`);
            console.log(`   Appliance: ${appliance || 'none'} ${appliance ? '✅' : '❌'}`);
            console.log(`   PM Job: ${isPM ? 'Yes ✅' : 'No'}`);
            console.log(`   Accept Link: ${acceptUrl ? '✅ Found' : '❌ Not found'}`);
            console.log(`   Jobs Today: ${jobsAcceptedToday}/4 (non-PM)`);

            // --- VALIDATION: Check if job meets criteria ---
            if (!zip || !ALLOWED_ZIPS.has(zip)) {
              console.log(`\n❌ REJECTED: Invalid ZIP (${zip || 'none'})`);
              return sendSystemAlert(
                "❌ Job Rejected - Invalid ZIP",
                `ZIP: ${zip || 'not found'}\nAppliance: ${appliance || 'none'}\n\nEmail from: ${from}`
              );
            }

            if (!appliance) {
              console.log(`\n❌ REJECTED: No matching appliance`);
              return sendSystemAlert(
                "❌ Job Rejected - No Appliance Match",
                `ZIP: ${zip}\nAppliance: none found\n\nEmail from: ${from}\n\nBody preview:\n${body.substring(0, 300)}`
              );
            }

            if (!acceptUrl) {
              console.log(`\n❌ REJECTED: No accept link found`);
              console.log(`   All links: ${JSON.stringify(links)}`);
              return sendSystemAlert(
                "❌ Job Rejected - No Accept Link",
                `ZIP: ${zip}\nAppliance: ${appliance}\n\nNo accept link found in email.\n\nLinks found: ${links ? links.join(', ') : 'none'}`
              );
            }

            // PM jobs bypass daily limit
            if (!isPM && jobsAcceptedToday >= 4) {
              console.log(`\n❌ REJECTED: Daily limit reached (${jobsAcceptedToday}/4 non-PM jobs)`);
              return sendSystemAlert(
                "⚠️ DAILY LIMIT REACHED",
                `Non-PM job skipped: ${appliance} in ${zip}. Already accepted ${jobsAcceptedToday} jobs today.`
              );
            }

            // --- JOB ACCEPTED: Open link and take screenshot ---
            const jobType = isPM ? 'PM' : 'Standard';
            console.log(`\n✅ ✅ ✅ JOB ACCEPTED (${jobType}): ${appliance} in ${zip}`);
            console.log(`🌐 Opening: ${acceptUrl}`);

            let browser;
            try {
              console.log('🚀 Launching browser...');
              browser = await puppeteer.launch({
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage',
                  '--single-process',
                  '--disable-gpu'
                ],
                headless: "new",
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
              });

              const page = await browser.newPage();
              await page.setViewport({ width: 1280, height: 800 });

              console.log('🌐 Loading page...');
              await page.goto(acceptUrl, { waitUntil: 'networkidle2', timeout: 30000 });
              
              console.log('⏳ Waiting 5 seconds for page to fully load...');
              await new Promise(r => setTimeout(r, 5000));

              const screenshotPath = '/tmp/job-screenshot.png';
              console.log('📸 Taking screenshot...');
              await page.screenshot({ path: screenshotPath, fullPage: true });
              console.log('✅ Screenshot captured');

              // Increment counter only for non-PM jobs
              if (!isPM) {
                jobsAcceptedToday++;
              }

              console.log('📧 Sending notification email...');
              await sendSystemAlert(
                `✅ JOB PROCESSED: ${appliance} (${zip})`,
                `Job Type: ${jobType}\n` +
                `Appliance: ${appliance}\n` +
                `ZIP: ${zip}\n` +
                `Jobs Today: ${jobsAcceptedToday}/4 (non-PM)\n\n` +
                `Link opened: ${acceptUrl}\n\n` +
                `See attached screenshot for confirmation.`,
                screenshotPath
              );

              console.log(`✅ ✅ ✅ Job complete! Total today: ${jobsAcceptedToday}/4 (non-PM jobs)\n`);

            } catch (e) {
              console.error("\n❌ Browser error:", e.message);
              console.error("Stack:", e.stack);
              await sendSystemAlert(
                `⚠️ ERROR: ${appliance} (${zip})`,
                `Failed to process job link.\nError: ${e.message}\nLink: ${acceptUrl}`
              );
            } finally {
              if (browser) {
                console.log('🔒 Closing browser...');
                await browser.close();
              }
            }
          });
        });
      });
    });
  });

  imap.on('error', (err) => {
    console.error('❌ IMAP error:', err.message);
    console.log('🔄 Reconnecting in 10 seconds...');
    setTimeout(() => imap.connect(), 10000);
  });

  imap.on('end', () => {
    console.log('🔌 Connection ended. Reconnecting in 5 seconds...');
    setTimeout(() => imap.connect(), 5000);
  });

  console.log('🔌 Connecting to IMAP...');
  imap.connect();
}

// Reset daily counter at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    jobsAcceptedToday = 0;
    console.log('🔄 Daily counter reset to 0');
    sendSystemAlert("🔄 DAILY RESET", "Job counter reset. Ready for new day!");
  }
}, 60000); // Check every minute

startListening();