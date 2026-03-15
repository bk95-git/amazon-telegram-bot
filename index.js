require('dotenv').config();
const express = require('express');
const { bot } = require('./src/telegram/bot');
const { processaProssimoLink } = require('./processa-links');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

app.post('/webhook', async (req, res) => {
    try { await bot.handleUpdate(req.body); res.sendStatus(200); }
    catch (error) { console.error('❌ Errore webhook:', error); res.sendStatus(500); }
});

app.get('/pubblica', async (req, res) => {
    try { const risultato = await processaProssimoLink(); res.json({ successo: risultato }); }
    catch (error) { res.status(500).json({ errore: error.message }); }
});

// ✅ Prima inizializza il bot, poi avvia il server
async function avvia() {
    try {
        await bot.init();
        console.log(`✅ Bot inizializzato: @${bot.botInfo.username}`);

        const server = app.listen(PORT, async () => {
            console.log(`🚀 Server avviato sulla porta ${PORT}`);

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
                console.warn('⚠️ RAILWAY_STATIC_URL non definita');
            }

            // Primo controllo subito all'avvio
            await processaProssimoLink();
        });

        cron.schedule('0 8-22/2 * * *', async () => {
            console.log(`⏰ Esecuzione programmata delle ${new Date().getHours()}:00`);
            await processaProssimoLink();
        }, { timezone: 'Europe/Rome' });

        setInterval(() => console.log('💓 Keepalive', new Date().toISOString()), 60000);

        process.on('SIGTERM', () => { 
            console.log('👋 Ricevuto SIGTERM, arresto...'); 
            server.close(() => process.exit(0)); 
        });

    } catch (error) {
        console.error('❌ Errore avvio bot:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', (err) => console.error('❌ Eccezione non catturata:', err));
process.on('unhandledRejection', (reason) => console.error('❌ Promise non gestita:', reason));

avvia();