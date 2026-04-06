require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const axios = require('axios');
const nodemailer = require('nodemailer');

// --- 1. Global State (ONLY DEFINE ONCE) ---
let jobsAcceptedToday = 0;

// This checks the Railway variable, removes spaces, and makes it Uppercase
const rawStatus = (process.env.AGENT_STATUS || 'ON').trim().toUpperCase();
let isAgentEnabled = (rawStatus !== 'OFF');

// --- DEBUG LOGS (Watch these in Railway) ---
console.log("------------------------------------------");
console.log(`🔎 RAILWAY VAR CHECK: "${process.env.AGENT_STATUS}"`);
console.log(`🤖 FINAL DECISION: Agent is ${isAgentEnabled ? 'ACTIVE ✅' : 'SLEEPING ⚠️'}`);
console.log("------------------------------------------");

const ALLOWED_ZIPS = new Set(["60169", "60159", "60168", "60195", "60193", "60194", "60107", "60196", "60173", "60133", "60172", "60192", "60067", "60008", "60179", "60157", "60120", "60103", "60108", "60117", "60007", "60038", "60055", "60078", "60094", "60143", "60005", "60011", "60006", "60074", "60009", "60095", "60121", "60122", "60188", "60139", "60199", "60010", "60197", "60116", "60128", "60132", "60191", "60004", "60184", "60118", "60101", "60123", "60056", "60177", "60106", "60185", "60070", "60105", "60399", "60110", "60186", "60138", "60187", "60174", "60190", "60090", "60666", "60018", "60016", "60021", "60019", "60599", "60148", "60017", "60701", "60688", "60089", "60137", "60047", "60102", "60181", "60126", "60189", "60176", "60131", "60013", "60164", "60068", "60156", "60169", "60136", "60124", "60026", "60163", "60555", "60165", "60062", "60175", "60015", "60061", "60714", "60134", "60025", "60060", "60569", "60183", "60656", "60631", "60160", "60065", "60515", "60523", "60162", "60084", "60706", "60104", "60171", "60161", "60014", "60053", "60563", "60042", "60634", "60532", "60039", "60029", "60566", "60567", "60154", "60082", "60510", "60153", "60707", "60147", "60539", "60305", "60077", "60155", "60559", "60540", "60514", "60502", "60646", "60048", "60522", "60519", "60045", "60012", "60526", "60521", "60093", "60630", "60035", "60142", "60558", "60141", "60130", "60022", "60301", "60040", "60302", "60598", "60140", "60712", "60542", "60037", "60682", "60076", "60303", "60641", "60091", "60513", "60051", "60516", "60639", "60546", "60572", "60304", "60203", "60030", "60505", "60504", "60073", "60517", "60043", "60561", "60565", "60201", "60644", "60651", "60044", "60568", "60507", "60659", "60534", "60625", "60645", "60109", "60204", "60119", "60202", "60402", "60618", "60527", "60525", "60041", "60506", "60647", "60208", "60804", "60624", "60088", "60626", "60050", "60501", "60564", "60503", "60440", "60660", "60180", "60064", "60020", "60640", "60086", "60623", "60151", "60613", "60622", "60458", "60612", "60490", "60144", "60657", "60638"]);

const ALLOWED_APPLIANCES = ["refrigerator", "oven", "washer", "dryer", "stovetop", "range", "cooktop", "dishwasher", "microwave"];

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com', port: 993, tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

// --- 2. Schedulers (Reset & End of Day Report) ---
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    jobsAcceptedToday = 0;
    console.log("🕛 Midnight: Daily job counter reset to 0.");
  }
  if (now.getHours() === 21 && now.getMinutes() === 0) {
    const reportText = `🌙 END OF DAY SUMMARY\nStatus: ${isAgentEnabled ? 'ACTIVE ✅' : 'SLEEPING ⚠️'}\nJobs Caught Today: ${jobsAcceptedToday}/4`;
    sendSystemAlert("📊 END OF DAY REPORT", reportText);
  }
}, 60000);

// --- 3. Notification Function ---
async function sendSystemAlert(subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: process.env.CLIENT_RECEIVE_EMAIL, subject, text });
  } catch (e) { console.error("Alert failed:", e.message); }
}

// --- 4. The Bot Engine ---
const imap = new Imap(imapConfig);

function startListening() {
  imap.once('ready', () => {
    console.log("📨 Bot is ACTIVE: Watching for TRM emails...");

    imap.openBox('INBOX', false, (err) => {
      if (err) {
        console.error('Failed to open INBOX:', err.message);
        throw err;
      }
      console.log('📬 INBOX selected and ready.');

      setInterval(() => {
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            console.error('💓 Heartbeat: failed to select INBOX:', err.message);
            return;
          }
          imap.search(['UNSEEN', ['HEADER', 'Subject', 'PING']], (err) => {
            if (err) console.log('💓 Heartbeat ping failed:', err.message);
            else console.log('💓 Heartbeat: Alive.');
          });
        });
      }, 60000);
    });

  });

  imap.on('mail', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) return;
      const f = imap.seq.fetch(box.messages.total + ':*', { bodies: '' });
      f.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;
            const from = (parsed.from.text || "").toLowerCase();
            const subject = (parsed.subject || "").toUpperCase();
            const bossEmail = process.env.CLIENT_RECEIVE_EMAIL.toLowerCase();

            // --- REMOTE CONTROL COMMANDS ---
            if (from.includes(bossEmail)) {
              if (subject.includes("AGENT: OFF")) {
                isAgentEnabled = false;
                console.log("🛑 COMMAND: Agent Disabled by Boss.");
                await sendSystemAlert("⚠️ AGENT STATUS: SLEEPING", "The agent has been turned OFF via email.");
                return;
              }
              if (subject.includes("AGENT: ON")) {
                isAgentEnabled = true;
                console.log("🚀 COMMAND: Agent Enabled by Boss.");
                await sendSystemAlert("✅ AGENT STATUS: ACTIVE", "The agent has been turned ON via email.");
                return;
              }
              if (subject.includes("AGENT: STATUS")) {
                const statusText = `STATUS: ${isAgentEnabled ? 'ACTIVE' : 'SLEEPING'}\nTODAY: ${jobsAcceptedToday}/4`;
                await sendSystemAlert("📊 AGENT REPORT", statusText);
                return;
              }
            }

            if (!isAgentEnabled) return;

            // --- JOB HUNTING LOGIC ---
            if (!from.includes('trm')) return;
            const body = (parsed.text || "").toLowerCase();
            const zipMatch = body.match(/\b\d{5}\b/);
            const zip = zipMatch ? zipMatch[0] : null;
            const appliance = ALLOWED_APPLIANCES.find(a => body.includes(a));
            const isPM = body.includes('property management') || body.includes('pm');
            const links = parsed.text.match(/https?:\/\/[^\s]+/g) || [];
            const acceptUrl = links.find(l => {
              const low = l.toLowerCase();
              return (low.includes('accept') || low.includes('claim')) && !low.includes('decline');
            });

            if (zip && ALLOWED_ZIPS.has(zip) && appliance && acceptUrl) {
              if (isPM || jobsAcceptedToday < 4) {
                try {
                  await axios.get(acceptUrl);
                  if (!isPM) jobsAcceptedToday++;
                  await sendSystemAlert(`✅ JOB ACCEPTED: ${zip}`, `Appliance: ${appliance}\nCount: ${jobsAcceptedToday}/4`);
                } catch (e) { console.log("Click failed:", e.message); }
              }
            }
          });
        });
      });
    });
  });

  imap.on('error', (err) => { setTimeout(() => imap.connect(), 10000); });
  imap.on('end', () => { setTimeout(() => imap.connect(), 5000); });
  imap.connect();
}

startListening();