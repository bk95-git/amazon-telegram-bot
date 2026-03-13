const cron = require('node-cron');
const { processaProssimoLink } = require('./processa-links');

// Pubblica ogni 2 ore tra le 8:00 e le 22:00
cron.schedule('0 8-22/2 * * *', async () => {
    const ora = new Date().getHours();
    console.log(`⏰ Esecuzione programmata delle ${ora}:00`);
    await processaProssimoLink();
}, {
    timezone: 'Europe/Rome'
});

console.log('✅ Scheduler avviato (pubblicazione ogni 2 ore, 8:00-22:00)');