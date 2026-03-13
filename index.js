require('dotenv').config();
const express = require('express');
const { bot } = require('./src/telegram/bot');
const { processaProssimoLink } = require('./processa-links');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per interpretare il JSON dei webhook
app.use(express.json());

// Endpoint per il webhook di Telegram
app.post('/webhook', async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Errore gestione webhook:', error);
        res.sendStatus(500);
    }
});

// Health check per Railway
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

// Avvio del server e impostazione del webhook
app.listen(PORT, async () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);

    // L'URL pubblico viene letto dalla variabile d'ambiente impostata su Railway
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
        console.warn('⚠️ RAILWAY_STATIC_URL non definita. Imposta il webhook manualmente o aggiungi la variabile.');
    }
});

// Scheduler per pubblicare un link ogni 2 ore (dalle 8:00 alle 22:00)
cron.schedule('0 8-22/2 * * *', async () => {
    const ora = new Date().getHours();
    console.log(`⏰ Esecuzione programmata delle ${ora}:00`);
    await processaProssimoLink();
}, {
    timezone: 'Europe/Rome'
});

console.log('✅ Scheduler avviato (pubblicazione ogni 2 ore, 8:00-22:00)');

// Gestione dell'arresto graceful
process.on('SIGINT', () => {
    console.log('\n👋 Arresto in corso...');
    process.exit(0);
});