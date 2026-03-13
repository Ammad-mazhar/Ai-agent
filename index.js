const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const puppeteer = require('puppeteer');

// 1. Heartbeat Server
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is active and healthy!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

// 2. Client Setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        // Point exactly to the path shown in your logs:
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

// 4. Start
client.initialize().catch(err => {
    console.error('❌ CRITICAL ERROR:', err.message);
});