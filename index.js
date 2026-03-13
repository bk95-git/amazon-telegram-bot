console.log('0. AVVIO INDEX.JS');
require('dotenv').config();
console.log('1. dotenv configurato');

const express = require('express');
console.log('2. express caricato');

const { bot } = require('./src/telegram/bot');
console.log('3. bot caricato');

const { caricaLinkDaSheets } = require('./src/sheets/reader');
console.log('3a. sheets reader caricato');

const { processaProssimoLink } = require('./processa-links');
console.log('3b. processa-links caricato');

const cron = require('node-cron');
console.log('3c. cron caricato');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    console.log('🏥 Health check richiesto');
    res.json({ status: 'OK', time: new Date().toISOString() });
});

app.post('/webhook', async (req, res) => {
    console.log('📩 Webhook ricevuto');
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Errore webhook:', error);
        res.sendStatus(500);
    }
});

app.get('/pubblica', async (req, res) => {
    console.log('📢 Richiesta pubblicazione manuale');
    try {
        const risultato = await processaProssimoLink();
        res.json({ successo: risultato });
    } catch (error) {
        console.error('❌ Errore pubblicazione:', error);
        res.status(500).json({ errore: error.message });
    }
});

console.log('4. app configurata');

const server = app.listen(PORT, async () => {
    console.log(`5. Server in ascolto sulla porta ${PORT}`);

    const webhookUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}/webhook`
        : null;

    if (webhookUrl) {
        try {
            await bot.api.setWebhook(webhookUrl);
            console.log(`6. Webhook impostato su ${webhookUrl}`);
        } catch (error) {
            console.error('❌ Errore webhook:', error);
        }
    } else {
        console.warn('6. RAILWAY_STATIC_URL non definita');
    }

    console.log('7. Avvio completato, in attesa...');
});

// SCHEDULER IN MODALITÀ TEST (SOLO LOG)
cron.schedule('*/5 * * * *', () => {
    console.log('⏰ Scheduler test: passati 5 minuti');
    // Non chiamiamo ancora processaProssimoLink
}, { timezone: 'Europe/Rome' });
console.log('✅ Scheduler test avviato (ogni 5 minuti)');

// Keepalive
setInterval(() => {
    console.log('💓 Keepalive', new Date().toISOString());
}, 60000);

// Gestione segnali
process.on('SIGINT', () => {
    console.log('👋 Ricevuto SIGINT, arresto...');
    server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
    console.log('👋 Ricevuto SIGTERM, arresto...');
    server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
    console.error('❌ Eccezione non catturata:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise non gestita:', reason);
});

console.log('8. INDEX.js completamente caricato');