require('dotenv').config();
const express = require('express');
const { bot } = require('./src/telegram/bot');
const { processaProssimoLink } = require('./processa-links');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint per il webhook di Telegram
app.use(express.json());
app.post('/webhook', async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Errore gestione webhook:', error);
        res.sendStatus(500);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

// Avvio server
app.listen(PORT, async () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    
    // Ottieni l'URL pubblico da Railway
    const webhookUrl = process.env.RAILWAY_STATIC_URL 
        ? `${process.env.RAILWAY_STATIC_URL}/webhook`
        : null;

    if (webhookUrl) {
        try {
            await bot.api.setWebhook(webhookUrl);
            console.log(`✅ Webhook impostato su ${webhookUrl}`);
        } catch (error) {
            console.error('❌ Errore impostazione webhook:', error);
        }
    } else {
        console.warn('⚠️ RAILWAY_STATIC_URL non definita, webhook non impostato');
    }
});

// Scheduler per pubblicazione ogni 2 ore (8-22)
cron.schedule('0 8-22/2 * * *', async () => {
    const ora = new Date().getHours();
    console.log(`⏰ Esecuzione programmata delle ${ora}:00`);
    await processaProssimoLink();
}, {
    timezone: 'Europe/Rome'
});

console.log('✅ Scheduler avviato (pubblicazione ogni 2 ore, 8:00-22:00)');

process.on('SIGINT', () => {
    console.log('\n👋 Arresto...');
    process.exit(0);
});