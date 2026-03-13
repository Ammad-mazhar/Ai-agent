const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// 1. Heartbeat Server (Required for Railway to stay alive)
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

// 2. Client Setup
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer'); // Add this line at the top

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        // This is the "Magic" line:
        executablePath: puppeteer.executablePath(), 
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
    console.log('--- QR CODE START ---');
    qrcode.generate(qr, { small: true });
    console.log('--- QR CODE END ---');
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is Ready!');
});

// 4. Start the bot
client.initialize().catch(err => {
    console.error('❌ FAILED TO LAUNCH CHROME:', err.message);
});