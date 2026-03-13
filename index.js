const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// 1. Heartbeat Server (Vital for Railway)
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(port, () => console.log(`Heartbeat server listening on port ${port}`));

// 2. WhatsApp Client Configuration
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        // Using the variable we set in Railway
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    }
});

// 3. QR Code Logic
client.on('qr', (qr) => {
    console.log('QR RECEIVED:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Client is Ready!');
});

// 4. Initialize
client.initialize().catch(err => console.error('Initialization error:', err));