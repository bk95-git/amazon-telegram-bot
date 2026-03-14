const puppeteer = require('puppeteer');

async function estraiDatiDaLink(url) {
    console.log(`🔍 Estraggo dati da: ${url}`);
    
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#productTitle', { timeout: 10000 });
        
        const dati = await page.evaluate(() => {
            function parsePrice(testo) {
                if (!testo) return null;
                // Pulisce il testo e estrae il primo numero con virgola o punto
                const match = testo.replace(/\./g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            }
            
            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';
            
            // --- PREZZO ATTUALE (prioritario) ---
            let prezzo = null;
            
            // Metodo 1: prezzo intero + frazione (classico)
            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent;
            if (intero && frazione) {
                prezzo = parseFloat(intero + '.' + frazione);
            }
            
            // Metodo 2: prezzo nella buy box (fallback)
            if (!prezzo) {
                const buyPrice = document.querySelector('#price_inside_buybox')?.textContent;
                if (buyPrice) prezzo = parsePrice(buyPrice);
            }
            
            // --- PREZZO ORIGINALE (ricerca a più livelli) ---
            let prezzoOriginale = null;
            
            // Livello 1: prezzo barrato classico (usato negli sconti)
            const prezzoBarrato = document.querySelector('.a-price.a-text-price span.a-offscreen');
            if (prezzoBarrato) {
                prezzoOriginale = parsePrice(prezzoBarrato.textContent);
            }
            
            // Livello 2: prezzo nella sezione "Sconto" (a volte diverso)
            if (!prezzoOriginale) {
                const strikePrice = document.querySelector('.priceBlockStrikePriceString');
                if (strikePrice) prezzoOriginale = parsePrice(strikePrice.textContent);
            }
            
            // Livello 3: prezzo consigliato nel blocco offerte
            if (!prezzoOriginale) {
                const listPrice = document.querySelector('.a-price-range .a-price-range .a-text-price span');
                if (listPrice) prezzoOriginale = parsePrice(listPrice.textContent);
            }
            
            // Livello 4: prezzo nella tabella dettagli (spesso "Prezzo listino:")
            if (!prezzoOriginale) {
                const detailRows = document.querySelectorAll('#productDetails_detailBullets_sections1 tr');
                detailRows.forEach(row => {
                    const label = row.querySelector('th')?.textContent;
                    if (label && label.includes('Prezzo listino')) {
                        const value = row.querySelector('td')?.textContent;
                        if (value) prezzoOriginale = parsePrice(value);
                    }
                });
            }
            
            // Livello 5: se ancora non trovato, usa il prezzo attuale (nessuno sconto)
            if (!prezzoOriginale && prezzo) {
                prezzoOriginale = prezzo;
            }
            
            // --- SCONTO ---
            let sconto = null;
            const scontoEl = document.querySelector('.savingsPercentage');
            if (scontoEl) {
                const match = scontoEl.textContent.match(/(\d+)%/);
                sconto = match ? parseInt(match[1]) : null;
            } else if (prezzoOriginale && prezzo && prezzoOriginale > prezzo) {
                sconto = Math.round(((prezzoOriginale - prezzo) / prezzoOriginale) * 100);
            } else {
                sconto = 0;
            }
            
            // --- IMMAGINE ---
            const immagine = document.querySelector('#landingImage')?.src || 
                            document.querySelector('.imgTagWrapper img')?.src || '';
            
            // --- ASIN ---
            const asin = document.querySelector('meta[name="asin"]')?.content || 
                         window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '';
            
            // --- DISPONIBILITÀ ---
            const disponibilita = document.querySelector('#availability span')?.textContent.trim() || '';
            const inStock = !disponibilita.toLowerCase().includes('non disponibile') && 
                           !disponibilita.toLowerCase().includes('esaurito');
            
            return {
                titolo,
                prezzo,
                prezzoOriginale,
                sconto,
                immagine,
                asin,
                inStock
            };
        });
        
        // --- CONTROLLO ANOMALIE ---
        if (dati.prezzoOriginale && dati.prezzo) {
            // Se il prezzo originale è palesemente falso (es. > 5000 o > prezzo * 10)
            if (dati.prezzoOriginale > 5000 || dati.prezzoOriginale > dati.prezzo * 10) {
                console.log('⚠️ Prezzo originale anomalo, lo ignoro e uso il prezzo attuale');
                dati.prezzoOriginale = dati.prezzo;
                dati.sconto = 0;
            }
            
            // Se il prezzo originale è minore del prezzo attuale (incoerente)
            if (dati.prezzoOriginale < dati.prezzo) {
                console.log('⚠️ Prezzo originale minore del prezzo attuale, scambio');
                [dati.prezzoOriginale, dati.prezzo] = [dati.prezzo, dati.prezzoOriginale];
                dati.sconto = dati.prezzoOriginale && dati.prezzo ? 
                    Math.round(((dati.prezzoOriginale - dati.prezzo) / dati.prezzoOriginale) * 100) : 0;
            }
        }
        
        await browser.close();
        return dati;
        
    } catch (error) {
        console.error('❌ Errore scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { estraiDatiDaLink };