require('dotenv').config();
const { estraiDatiDaLink } = require('./src/amazon/scraper');
const { pubblicaOfferta } = require('./src/telegram/bot');
const { caricaLinkDaSheets, segnaComePubblicato } = require('./src/sheets/reader');

async function processaProssimoLink() {
    console.log('🔄 Controllo prossimo link da Google Sheets...');
    try {
        const risultato = await caricaLinkDaSheets();
        if (!risultato || !risultato.link) {
            console.log('📭 Nessun link disponibile nel foglio');
            return false;
        }
        const link = risultato.link;
        console.log(`🔗 Elaboro: ${link}`);
        const dati = await estraiDatiDaLink(link);
        console.log('📦 DATI APPENA ESTRATTI (in processa-links):', JSON.stringify(dati, null, 2));

        if (!dati || !dati.prezzo || !dati.inStock) {
            console.log(`❌ Dati non validi o prodotto non disponibile per ${link}`);
            risultato.row.set('Pubblicato', 'ERRORE');
            await risultato.row.save();
            return false;
        }

        // Controllo validità prezzo originale
        if (!dati.prezzoOriginale || dati.prezzoOriginale <= dati.prezzo) {
    console.log(`⛔ Nessuno sconto reale trovato per questo prodotto, salto`);
    risultato.row.set('Pubblicato', 'NO_SCONTO');
    await risultato.row.save();
    return false;
}
        }

        const offerta = {
            asin: dati.asin,
            titolo: dati.titolo,
            prezzo: dati.prezzo,
            prezzoOriginale: dati.prezzoOriginale,
            sconto: dati.sconto,
            link: link + `?tag=${process.env.AMAZON_PARTNER_TAG}`,
            immagine: dati.immagine,
            categoria: 'Manuale'
        };
        const èErrore = dati.sconto > 60;
        const successo = await pubblicaOfferta(offerta, èErrore);
        if (successo) {
            console.log(`✅ Pubblicato: ${dati.titolo.substring(0, 50)}...`);
            await segnaComePubblicato(risultato.row);
            return true;
        } else {
            console.log(`❌ Pubblicazione fallita per ${link}`);
            risultato.row.set('Pubblicato', 'ERRORE');
            await risultato.row.save();
            return false;
        }
    } catch (error) {
        console.log(`❌ Errore durante l'elaborazione: ${error.message}`);
        return false;
    }
}

module.exports = { processaProssimoLink };