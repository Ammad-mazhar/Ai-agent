require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();

// --- Configuration ---
let isAgentActive = false;
let jobsAcceptedToday = 0;
const ALLOWED_ZIPS = new Set(["60169", "60159", "60168", "60195", "60193", "60194", "60107", "60196", "60173", "60133", "60172", "60192", "60067", "60008", "60179", "60157", "60120", "60103", "60108", "60117", "60007", "60038", "60055", "60078", "60094", "60143", "60005", "60011", "60006", "60074", "60009", "60095", "60121", "60122", "60188", "60139", "60199", "60010", "60197", "60116", "60128", "60132", "60191", "60004", "60184", "60118", "60101", "60123", "60056", "60177", "60106", "60185", "60070", "60105", "60399", "60110", "60186", "60138", "60187", "60174", "60190", "60090", "60666", "60018", "60016", "60021", "60019", "60599", "60148", "60017", "60701", "60688", "60089", "60137", "60047", "60102", "60181", "60126", "60189", "60176", "60131", "60013", "60164", "60068", "60156", "60169", "60136", "60124", "60026", "60163", "60555", "60165", "60062", "60175", "60015", "60061", "60714", "60134", "60025", "60060", "60569", "60183", "60656", "60631", "60160", "60065", "60515", "60523", "60162", "60084", "60706", "60104", "60171", "60161", "60014", "60053", "60563", "60042", "60634", "60532", "60039", "60029", "60566", "60567", "60154", "60082", "60510", "60153", "60707", "60147", "60539", "60305", "60077", "60155", "60559", "60540", "60514", "60502", "60646", "60048", "60522", "60519", "60045", "60012", "60526", "60521", "60093", "60630", "60035", "60142", "60558", "60141", "60130", "60022", "60301", "60040", "60302", "60598", "60140", "60712", "60542", "60037", "60682", "60076", "60303", "60641", "60091", "60513", "60051", "60516", "60639", "60546", "60572", "60304", "60203", "60030", "60505", "60504", "60073", "60517", "60043", "60561", "60565", "60201", "60644", "60651", "60044", "60568", "60507", "60659", "60534", "60625", "60645", "60109", "60204", "60119", "60202", "60402", "60618", "60527", "60525", "60041", "60506", "60647", "60208", "60804", "60624", "60088", "60626", "60050", "60501", "60564", "60503", "60440", "60660", "60180", "60064", "60020", "60640", "60086", "60623", "60151", "60613", "60622", "60458", "60612", "60490", "60144", "60657", "60638"]); // Add your 100+ zips here
const ALLOWED_APPLIANCES = ["refrigerator", "oven", "washer", "dryer", "dishwasher", "microwave", "stove", "range", "cooktop"];

// --- Email Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- The Job Filtering Logic ---
async function startAgent() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  while (true) {
    if (!isAgentActive) {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    const now = new Date();
    // If it's 12:00 AM (00:00), reset the counter
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      jobsAcceptedToday = 0;
      console.log("🕛 Midnight reached. Daily job limit reset to 0.");
    }
    try {
      await page.goto('https://trmservices.com/login'); // Update with actual TRM login URL
      // Add Login Logic here if not logged in

      // 1. Scan for Jobs
      const jobs = []; // Replace with actual page.evaluate to get jobs from TRM table

      for (const job of jobs) {
        const isPM = job.description.toLowerCase().includes('pm') || job.description.toLowerCase().includes('property management');
        const zipMatch = ALLOWED_ZIPS.has(job.zip);
        const applianceMatch = ALLOWED_APPLIANCES.some(a => job.description.toLowerCase().includes(a));

        if (zipMatch && applianceMatch) {
          // Check if we should accept
          if (isPM || jobsAcceptedToday < 4) {
            console.log(`✅ Accepting Job: ${job.id}`);
            // await page.click(job.acceptButtonSelector);

            const screenshotPath = `proof-${job.id}.png`;
            await page.screenshot({ path: screenshotPath });

            await sendEmail(job, isPM, screenshotPath);
            if (!isPM) jobsAcceptedToday++;
          }
        }
      }
    } catch (err) {
      console.error("Loop Error:", err.message);
    }

    await new Promise(r => setTimeout(r, 15000)); // 15-second wait
  }
}

async function sendEmail(job, isPM, path) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.CLIENT_RECEIVE_EMAIL,
    subject: `✅ NEW JOB: ${isPM ? '[PM]' : '[Standard]'} - Zip ${job.zip}`,
    text: `Accepted a ${job.appliance} job in ${job.zip}. Proof attached.`,
    attachments: [{ filename: 'proof.png', path }]
  });
}

// --- Routes ---
app.get('/agent/toggle', (req, res) => {
  if (req.query.key !== process.env.AGENT_PASSWORD) return res.status(401).send("Unauthorized");
  isAgentActive = !isAgentActive;
  res.send(`Agent is now ${isAgentActive ? 'ONLINE' : 'OFFLINE'}`);
});

app.get('/view-logs', (req, res) => {
  res.send(`Jobs Accepted Today: ${jobsAcceptedToday}/4 (Standard). PM jobs are unlimited.`);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
  startAgent();
});