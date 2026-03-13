require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { estraiDatiDaLink } = require('./src/amazon/scraper');
const { pubblicaOfferta } = require('./src/telegram/bot');

const FILE_LINK = path.join(__dirname, 'offerte.txt');
const FILE_PUBBLICATI = path.join(__dirname, 'pubblicati.txt');
const FILE_LOG = path.join(__dirname, 'log.txt');

function leggiProssimoLink() {
    if (!fs.existsSync(FILE_LINK)) {
        console.log('❌ File offerte.txt non trovato');
        return null;
    }
    
    const links = fs.readFileSync(FILE_LINK, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && l.startsWith('http'));
    
    if (links.length === 0) return null;
    
    const link = links[0];
    const rimanenti = links.slice(1).join('\n');
    fs.writeFileSync(FILE_LINK, rimanenti);
    
    return link;
}

function salvaPubblicato(link, dati) {
    const riga = `${new Date().toISOString()} | ${link} | ${dati?.titolo || 'ERRORE'} | ${dati?.prezzo || '?'}€\n`;
    fs.appendFileSync(FILE_PUBBLICATI, riga);
}

function log(messaggio) {
    const riga = `${new Date().toISOString()} | ${messaggio}\n`;
    fs.appendFileSync(FILE_LOG, riga);
    console.log(messaggio);
}

async function processaProssimoLink() {
    log('🔄 Controllo prossimo link...');
    
    const link = leggiProssimoLink();
    if (!link) {
        log('📭 Nessun link disponibile in offerte.txt');
        return false;
    }
    
    log(`🔗 Elaboro: ${link}`);
    
    const dati = await estraiDatiDaLink(link);
    
    if (!dati || !dati.prezzo || !dati.inStock) {
        log(`❌ Dati non validi o prodotto non disponibile per ${link}`);
        salvaPubblicato(link, dati);
        return false;
    }
    
    const offerta = {
        asin: dati.asin,
        titolo: dati.titolo,
        prezzo: dati.prezzo,
        prezzoOriginale: dati.prezzoOriginale || dati.prezzo * 1.3,
        sconto: dati.sconto || 0,
        link: link + `?tag=${process.env.AMAZON_PARTNER_TAG}`,
        immagine: dati.immagine,
        categoria: 'Manuale'
    };
    
    const èErrore = dati.sconto > 60;
    const successo = await pubblicaOfferta(offerta, èErrore);
    
    if (successo) {
        log(`✅ Pubblicato: ${dati.titolo.substring(0, 50)}...`);
        salvaPubblicato(link, dati);
        return true;
    } else {
        log(`❌ Pubblicazione fallita per ${link}`);
        salvaPubblicato(link, dati);
        return false;
    }
}

module.exports = { processaProssimoLink };