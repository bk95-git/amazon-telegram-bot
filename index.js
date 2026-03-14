console.log('0. AVVIO INDEX.JS');
require('dotenv').config();
console.log('1. dotenv configurato');

const express = require('express');
console.log('2. express caricato');

const { bot } = require('./src/telegram/bot');
console.log('3. bot caricato');

const { processaProssimoLink } = require('./processa-links');
console.log('4. processa-links caricato');

const cron = require('node-cron');
console.log('5. cron caricato');

const app = express();
console.log('6. express app creata');

const PORT = process.env.PORT || 3000;
console.log(`7. PORT = ${PORT}`);

app.use(express.json());
console.log('8. middleware json attivato');

// Health check semplice
app.get('/health', (req, res) => {
    console.log('🏥 Health check richiesto');
    res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});
console.log('9. route /health definita');

// Endpoint webhook
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
console.log('10. route /webhook definita');

// Endpoint pubblicazione manuale
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
console.log('11. route /pubblica definita');

// Avvio server
const server = app.listen(PORT, async () => {
    console.log(`12. Server in ascolto sulla porta ${PORT}`);

    const webhookUrl = process.env.RAILWAY_STATIC_URL
        ? `https://${process.env.RAILWAY_STATIC_URL}/webhook`
        : null;

    if (webhookUrl) {
        try {
            await bot.api.setWebhook(webhookUrl);
            console.log(`13. Webhook impostato su ${webhookUrl}`);
        } catch (error) {
            console.error('❌ Errore impostazione webhook:', error);
        }
    } else {
        console.warn('13. RAILWAY_STATIC_URL non definita');
    }

    console.log('14. Avvio completato, in attesa...');
});

// Scheduler (commentato per ora per isolare il problema)
/*
cron.schedule('0 8-22/2 * * *', async () => {
    const ora = new Date().getHours();
    console.log(`⏰ Esecuzione programmata delle ${ora}:00`);
    try {
        await processaProssimoLink();
    } catch (error) {
        console.error('❌ Errore scheduler:', error);
    }
}, { timezone: 'Europe/Rome' });
console.log('✅ Scheduler avviato (pubblicazione ogni 2 ore, 8:00-22:00)');
*/

// Keepalive
setInterval(() => {
    console.log('💓 Keepalive', new Date().toISOString());
}, 60000);

// Gestione arresto
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

console.log('15. INDEX.js completamente caricato');