const { Client, LocalAuth } = require('whatsapp-web.js');
global.agentEnabled = true;

const qrcode = require('qrcode-terminal');
const express = require('express');
const puppeteer = require('puppeteer');

// Global agent toggle
let agentEnabled = true;

// 1. Heartbeat Server
const app = express();
const port = process.env.PORT || 8080;

const SECRET_KEY = '4321';

// Secure manage route
app.get('/manage-agent', (req, res) => {
  if (req.query.pass !== SECRET_KEY) {
    return res.status(401).send('Unauthorized');
  }
  agentEnabled = !agentEnabled;
  const status = agentEnabled ? 'enabled' : 'disabled';
  res.send(`Agent ${status}`);
  console.log(`Agent ${status} via /manage-agent (pass verified)`);
});

// Secure logs viewer
app.get('/view-logs', (req, res) => {
  if (req.query.pass !== SECRET_KEY) {
    return res.status(401).send('Unauthorized');
  }
  
  try {
    const fs = require('fs');
    let logs = [];
    if (fs.existsSync('history.log')) {
      const data = fs.readFileSync('history.log', 'utf8');
      logs = data.split('\n').filter(line => line.trim()).reverse();
    }
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Agent Logs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { padding: 20px; background: #f8f9fa; }
    .log-success { background-color: #d4edda !important; }
    .log-error { background-color: #f8d7da !important; }
    .log-row { word-break: break-word; }
  </style>
</head>
<body>
  <div class="container">
    <h2 class="mb-4">🤖 AI Agent Logs <small class="text-muted">(Latest first)</small></h2>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr><th>Log Entry</th><th>Time</th></tr>
        </thead>
        <tbody>`;
    
    logs.forEach((line, i) => {
      const timeMatch = line.match(/\\[0-9]{2}:[0-9]{2}:[0-9]{2}/) || line.match(/([0-9]{2}:[0-9]{2}:[0-9]{2})/);
      const time = timeMatch ? timeMatch[0] : 'N/A';
      const rowClass = line.includes('✅') ? 'log-success' : line.includes('❌') ? 'log-error' : '';
      html += `<tr class="${rowClass}"><td class="log-row">${line}</td><td>${time}</td></tr>`;
    });
    
    html += `
        </tbody>
      </table>
    </div>
    <a href="/manage-agent?pass=${SECRET_KEY}" class="btn btn-warning mt-3">Toggle Agent</a>
    <a href="/" class="btn btn-secondary mt-3 ms-2">Home</a>
  </div>
</body>
</html>`;
    
    res.send(html);
  } catch (err) {
    res.status(500).send('Error reading logs');
  }
});

app.get('/', (req, res) => res.send(`Bot is active! Agent enabled: ${agentEnabled}`));
app.listen(port, () => console.log(`Server listening on port ${port}`));


// 2. Client Setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        // We are using the exact path from your previous log:
        executablePath: '/root/.cache/puppeteer/chrome/linux-146.0.7680.66/chrome-linux64/chrome',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// 3. QR Code Logic
client.on('qr', (qr) => {
    console.log('--- QR CODE RECEIVED ---');
    qrcode.generate(qr, { small: true });
    console.log('Scan the code above with WhatsApp Linked Devices.');
});

client.on('ready', () => {
    console.log('✅ Success! WhatsApp Bot is Ready!');
});

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Placeholder job agent function - replace with your actual implementation
async function startJobAgent() {
  console.log('🔍 Starting job check...');
  // Here you would:
  // 1. Navigate to job board
  // 2. processJobDecision or applyToJob
  // Example:
  // const { processJobDecision } = require('./puppeteer-job-applier.js');
  // await processJobDecision(page, browser);
  await sleep(2000); // Simulate work
  console.log('✅ Job check completed');
}

// Robust job checking loop
async function jobAgentLoop() {
  console.log('🔄 Job agent loop started');
  while (true) {
    console.log('Starting new check cycle...');
    
    if (agentEnabled) {
      try {
        await startJobAgent();
      } catch (err) {
        console.error('❌ startJobAgent failed, continuing loop:', err.message);
      }
    } else {
      console.log('⏸️ Agent disabled, skipping check');
    }
    
    console.log('Waiting 15 seconds...');
    await sleep(15000);
  }
}

// 4. Start
client.initialize().catch(err => {
    console.error('❌ CRITICAL ERROR:', err.message);
});

// Start job loop after WhatsApp ready (non-blocking)
client.on('ready', async () => {
    console.log('✅ WhatsApp ready, starting job agent loop');
    jobAgentLoop().catch(console.error);
});
