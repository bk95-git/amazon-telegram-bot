require('dotenv').config();
const { estraiDatiDaLink } = require('./src/amazon/scraper');

async function test() {
    const link = 'https://www.amazon.it/dp/B0DZ5V7H86'; // Sostituisci con un link valido
    const dati = await estraiDatiDaLink(link);
    console.log('Risultato:', dati);
}

test();