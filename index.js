require('dotenv').config();
const express = require('express');
const { bot } = require('./src/telegram/bot');
require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

bot.start();

app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 BOT OFFERTE AVVIATO');
    console.log('=================================');
    console.log(`📱 Canale: ${process.env.TELEGRAM_CHANNEL_ID}`);
    console.log(`🌍 Porta: ${PORT}`);
    console.log('=================================');
});

process.on('SIGINT', () => {
    console.log('\n👋 Arresto...');
    bot.stop();
    process.exit(0);
});