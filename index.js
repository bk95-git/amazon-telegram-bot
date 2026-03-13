console.log('0. AVVIO INDEX.JS');
require('dotenv').config();
console.log('1. dotenv configurato');

const express = require('express');
console.log('2. express caricato');

const { bot } = require('./src/telegram/bot');
console.log('3. bot caricato');

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