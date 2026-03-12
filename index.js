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
        '--single-process',
        '--no-zygote'
    ],
    // This allows the bot to find the Chrome we just installed
    executablePath: '/app/.cache/puppeteer/chrome/linux-133.0.6943.98/chrome-linux64/chrome' 
    // Note: If that path fails, just REMOVE the executablePath line entirely 
    // and let Puppeteer find it automatically after the postinstall runs.
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