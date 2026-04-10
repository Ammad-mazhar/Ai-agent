require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// --- 1. Global State ---
let jobsAcceptedToday = 0;
const rawStatus = (process.env.AGENT_STATUS || 'ON').trim().toUpperCase();
let isAgentEnabled = (rawStatus !== 'OFF');

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
    console.log("✅ Bot ACTIVE: Accepting ALL credit jobs from theappliancerepairmen.com...");
    console.log(`📊 No limits - All credit jobs accepted | Status: ${isAgentEnabled ? 'ON' : 'OFF'}`);
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

            const body = (parsed.text || parsed.html || "").toLowerCase();
            
            // DEBUG: Show first 500 chars of email body
            console.log(`\n📄 Email body preview:\n${body.substring(0, 500)}...\n`);
            
            // Extract data from email
            const emailContent = parsed.text || parsed.html || "";
            
            // Extract ZIP for logging only
            const zipMatch = body.match(/\b\d{5}\b/);
            const zip = zipMatch ? zipMatch[0] : 'Unknown';
            
            // Check for credit payment - ONLY VALIDATION
            const isCredit = body.includes('credit') || body.includes('cc') || body.includes('card');
            
            // Find accept link
            const links = emailContent.match(/https?:\/\/[^\s<>"]+/g) || [];
            const acceptUrl = links.find(l => l.toLowerCase().includes('accept') && !l.toLowerCase().includes('decline'));

            // DEBUG: Show all found links
            console.log(`\n🔗 Links found in email: ${links ? links.length : 0}`);
            if (links && links.length > 0) {
              links.forEach((link, i) => console.log(`   Link ${i + 1}: ${link}`));
            }

            console.log(`\n🔍 Validation Results:`);
            console.log(`   ZIP: ${zip} (no validation)`);
            console.log(`   Credit Payment: ${isCredit ? '✅ YES' : '❌ NO'}`);
            console.log(`   Accept Link: ${acceptUrl ? '✅ Found' : '❌ Not found'}`);
            console.log(`   Jobs Accepted Today: ${jobsAcceptedToday}`);

            // --- VALIDATION: Only check credit payment ---
            if (!isCredit) {
              console.log(`\n❌ REJECTED: Not a credit payment job`);
              return sendSystemAlert(
                "❌ Job Rejected - Not Credit",
                `ZIP: ${zip}\n\nJob is not credit payment.\n\nEmail from: ${from}`
              );
            }

            if (!acceptUrl) {
              console.log(`\n❌ REJECTED: No accept link found`);
              console.log(`   All links: ${JSON.stringify(links)}`);
              return sendSystemAlert(
                "❌ Job Rejected - No Accept Link",
                `ZIP: ${zip}\n\nNo accept link found in email.\n\nLinks found: ${links ? links.join(', ') : 'none'}`
              );
            }

            // --- JOB ACCEPTED: Open link and take screenshot ---
            jobsAcceptedToday++;
            console.log(`\n✅ ✅ ✅ JOB ACCEPTED (CREDIT): ZIP ${zip}`);
            console.log(`🌐 Opening: ${acceptUrl}`);

            let browser;
            try {
              console.log('🚀 Launching browser...');
              browser = await puppeteer.launch({
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage',
                  '--disable-gpu',
                  '--no-first-run',
                  '--no-zygote'
                ],
                headless: true
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

              console.log('📧 Sending notification email...');
              await sendSystemAlert(
                `✅ CREDIT JOB PROCESSED: ZIP ${zip}`,
                `ZIP: ${zip}\n` +
                `Total Jobs Accepted Today: ${jobsAcceptedToday}\n\n` +
                `Link opened: ${acceptUrl}\n\n` +
                `See attached screenshot for confirmation.`,
                screenshotPath
              );

              console.log(`✅ ✅ ✅ Job complete! Total today: ${jobsAcceptedToday}\n`);

            } catch (e) {
              console.error("\n❌ Browser error:", e.message);
              console.error("Stack:", e.stack);
              await sendSystemAlert(
                `⚠️ ERROR: ZIP ${zip}`,
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