const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const express = require('express'); // 1. Add Express

// 2. Create a tiny heartbeat server
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Heartbeat server listening on port ${port}`));

// 3. Your existing Client setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process', // Highly recommended for cloud
            '--no-zygote'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    }
});

// 4. QR Code display
client.on('qr', (qr) => {
    console.log('QR RECEIVED:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();