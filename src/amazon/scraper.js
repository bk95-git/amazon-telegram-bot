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
            // Funzione per pulire e convertire un prezzo in numero
            function parsePrice(testo) {
                if (!testo) return null;
                // Rimuove simboli, punti e sostituisce virgola con punto
                const pulito = testo.replace(/[^\d,]/g, '').replace(',', '.');
                const numero = parseFloat(pulito);
                return isNaN(numero) ? null : numero;
            }

            // Cerca un prezzo usando una lista di selettori, restituisce il primo valido
            function cercaPrezzo(selettori) {
                for (const sel of selettori) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const testo = el.textContent.trim();
                        const prezzo = parsePrice(testo);
                        if (prezzo && prezzo > 0) return prezzo;
                    }
                }
                return null;
            }

            // --- TITOLO ---
            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';

            // --- PREZZO ATTUALE (cerca in ordine) ---
            let prezzo = cercaPrezzo([
                '.a-price-whole',  // prezzo intero + frazione (poi lo combiniamo)
                '#price_inside_buybox',
                '.a-price .a-offscreen'
            ]);

            // Se abbiamo solo la parte intera e frazione separata, li combiniamo
            if (!prezzo) {
                const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
                const frazione = document.querySelector('.a-price-fraction')?.textContent;
                if (intero && frazione) {
                    prezzo = parseFloat(intero + '.' + frazione);
                }
            }

            // --- PREZZO ORIGINALE (cerca in più punti) ---
            let prezzoOriginale = cercaPrezzo([
                '.a-price.a-text-price span.a-offscreen',
                '.priceBlockStrikePriceString',
                '.a-price-range .a-price-range .a-text-price span',
                '#price_inside_buybox' // a volte contiene il prezzo originale? non di solito, ma proviamo
            ]);

            // Se non trovato, cerca nella tabella dettagli "Prezzo listino"
            if (!prezzoOriginale) {
                const rows = document.querySelectorAll('#productDetails_detailBullets_sections1 tr');
                for (const row of rows) {
                    const label = row.querySelector('th')?.textContent;
                    if (label && label.includes('Prezzo listino')) {
                        const value = row.querySelector('td')?.textContent;
                        if (value) {
                            prezzoOriginale = parsePrice(value);
                            break;
                        }
                    }
                }
            }

            // --- VALIDAZIONE PREZZO ORIGINALE ---
            // Se il prezzo originale è anomalo (troppo alto o irrealistico), lo scartiamo
            if (prezzoOriginale && prezzo) {
                if (prezzoOriginale > 5000 || prezzoOriginale > prezzo * 5) {
                    console.log('⚠️ Prezzo originale anomalo scartato');
                    prezzoOriginale = null;
                }
            }

            // Se non abbiamo un prezzo originale valido, usiamo il prezzo attuale (nessuno sconto)
            if (!prezzoOriginale && prezzo) {
                prezzoOriginale = prezzo;
            }

            // --- SCONTO ---
            let sconto = 0;
            if (prezzoOriginale && prezzo && prezzoOriginale > prezzo) {
                sconto = Math.round(((prezzoOriginale - prezzo) / prezzoOriginale) * 100);
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
        
        await browser.close();
        
        // Log dei dati estratti per debug
        console.log('📦 DATI ESTRATTI:', JSON.stringify(dati, null, 2));
        
        return dati;
        
    } catch (error) {
        console.error('❌ Errore scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { estraiDatiDaLink };