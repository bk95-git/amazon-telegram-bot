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
                const match = testo.replace(/[^\d,]/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            }
            
            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';
            
            // --- PREZZO ATTUALE ---
            let prezzo = null;
            
            // Metodo 1: prezzo intero + frazione
            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent;
            if (intero && frazione) {
                prezzo = parseFloat(intero + '.' + frazione);
            }
            
            // Metodo 2: prezzo nella buy box
            if (!prezzo) {
                const buyPrice = document.querySelector('#price_inside_buybox')?.textContent;
                if (buyPrice) prezzo = parsePrice(buyPrice);
            }
            
            // --- PREZZO ORIGINALE (ricerca a più livelli) ---
            let prezzoOriginale = null;
            
            // Livello 1: prezzo barrato classico
            const prezzoBarrato = document.querySelector('.a-price.a-text-price span.a-offscreen');
            if (prezzoBarrato) {
                prezzoOriginale = parsePrice(prezzoBarrato.textContent);
            }
            
            // Livello 2: prezzo nella sezione "Sconto" (a volte in un altro span)
            if (!prezzoOriginale) {
                const strikePrice = document.querySelector('.priceBlockStrikePriceString');
                if (strikePrice) prezzoOriginale = parsePrice(strikePrice.textContent);
            }
            
            // Livello 3: prezzo consigliato nella tabella dettagli (es. "Prezzo consigliato:")
            if (!prezzoOriginale) {
                const rows = document.querySelectorAll('#productDetails_detailBullets_sections1 tr, .a-normal tr');
                for (const row of rows) {
                    const label = row.querySelector('th')?.textContent;
                    if (label && (label.includes('Prezzo consigliato') || label.includes('List Price'))) {
                        const value = row.querySelector('td')?.textContent;
                        if (value) {
                            prezzoOriginale = parsePrice(value);
                            break;
                        }
                    }
                }
            }
            
            // Livello 4: prezzo nel JSON-LD (dati strutturati)
            if (!prezzoOriginale) {
                const script = document.querySelector('script[type="application/ld+json"]');
                if (script) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data.offers && data.offers.price) {
                            // Se c'è un prezzo di listino, potrebbe essere in data.offers.highPrice
                            if (data.offers.highPrice) {
                                prezzoOriginale = data.offers.highPrice;
                            }
                        }
                    } catch (e) {}
                }
            }
            
            // Se non troviamo prezzo originale, lo impostiamo uguale al prezzo attuale (nessuno sconto)
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
        return dati;
        
    } catch (error) {
        console.error('❌ Errore scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { estraiDatiDaLink };