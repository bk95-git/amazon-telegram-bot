require('dotenv').config();
const express = require('express');
const { bot } = require('./src/telegram/bot');
const { processaProssimoLink } = require('./processa-links');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per il parsing JSON (necessario per webhook)
app.use(express.json());

// Health check con log
app.get('/health', (req, res) => {
    console.log('🏥 Health check richiesto');
    res.json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Endpoint per il webhook di Telegram
app.post('/webhook', async (req, res) => {
    console.log('📩 Webhook ricevuto da Telegram');
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Errore gestione webhook:', error);
        res.sendStatus(500);
    }
});

// Endpoint per forzare la pubblicazione (utile per test)
app.get('/pubblica', async (req, res) => {
    console.log('📢 Richiesta pubblicazione manuale');
    try {
        const risultato = await processaProssimoLink();
        res.json({ successo: risultato });
    } catch (error) {
        console.error('❌ Errore pubblicazione manuale:', error);
        res.status(500).json({ errore: error.message });
    }
});

// Avvio server e impostazione webhook
app.listen(PORT, async () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    
    // Ottieni l'URL pubblico da Railway
    const webhookUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}/webhook`
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
    try {
        await processaProssimoLink();
    } catch (error) {
        console.error('❌ Errore nello scheduler:', error);
    }
}, {
    timezone: 'Europe/Rome'
});

console.log('✅ Scheduler avviato (pubblicazione ogni 2 ore, 8:00-22:00)');

// Gestione arresto pulito
process.on('SIGINT', () => {
    console.log('\n👋 Arresto in corso...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Ricevuto SIGTERM, arresto...');
    process.exit(0);
});

// Gestione errori non catturati (per evitare crash)
process.on('uncaughtException', (err) => {
    console.error('❌ Eccezione non catturata:', err);
    // Non usciamo, continuiamo a funzionare
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise non gestita:', reason);
    // Non usciamo
});