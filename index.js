const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// 1. Heartbeat Server
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

// 2. Client Setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        // WE DO NOT SET executablePath HERE. 
        // Puppeteer will find the installed chrome automatically.
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote'
        ]
    }
});

// 3. QR Code Logic
client.on('qr', (qr) => {
    console.log('QR RECEIVED - Scan this in your terminal/logs:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is Ready!');
});

// 4. Start the bot
client.initialize().catch(err => {
    console.error('FAILED TO LAUNCH CHROME:', err.message);
});