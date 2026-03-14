require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { estraiDatiDaLink } = require('./src/amazon/scraper');
const { pubblicaOfferta } = require('./src/telegram/bot');
const { caricaLinkDaSheets, segnaComePubblicato } = require('./src/sheets/reader');

const FILE_LOG = path.join(__dirname, 'log.txt');

function log(messaggio) {
    const riga = `${new Date().toISOString()} | ${messaggio}\n`;
    try {
        fs.appendFileSync(FILE_LOG, riga);
    } catch (e) {
        // Ignora errori di scrittura (su Railway potrebbe non essere permesso)
    }
    console.log(messaggio);
}

async function processaProssimoLink() {
    log('🔄 Controllo prossimo link da Google Sheets...');
    
    try {
        // Legge il prossimo link dal foglio
        const risultato = await caricaLinkDaSheets();
        
        if (!risultato || !risultato.link) {
            log('📭 Nessun link disponibile nel foglio');
            return false;
        }
        
        const link = risultato.link;
        log(`🔗 Elaboro: ${link}`);
        
        const dati = await estraiDatiDaLink(link);
        
        // 🔍 LOG AGGIUNTO: vediamo cosa arriva dallo scraper
        console.log('📦 DAT APPENA ESTRATTI (in processa-links):', JSON.stringify(dati, null, 2));
        
        if (!dati || !dati.prezzo || !dati.inStock) {
            log(`❌ Dati non validi o prodotto non disponibile per ${link}`);
            try {
                risultato.row.set('Pubblicato', 'ERRORE');
                await risultato.row.save();
            } catch (e) {}
            return false;
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
            log(`✅ Pubblicato: ${dati.titolo.substring(0, 50)}...`);
            await segnaComePubblicato(risultato.row);
            return true;
        } else {
            log(`❌ Pubblicazione fallita per ${link}`);
            try {
                risultato.row.set('Pubblicato', 'ERRORE');
                await risultato.row.save();
            } catch (e) {}
            return false;
        }
        
    } catch (error) {
        log(`❌ Errore durante l'elaborazione: ${error.message}`);
        return false;
    }
}

module.exports = { processaProssimoLink };