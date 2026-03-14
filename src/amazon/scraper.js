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

            function isPrezzoValido(valore) {
                return valore && valore > 0 && valore < 5000; // esclude placeholder 9999
            }

            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';

            // Prezzo attuale
            let prezzo = null;
            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent;
            if (intero && frazione) {
                prezzo = parseFloat(intero + '.' + frazione);
            }
            if (!prezzo) {
                const buyPrice = document.querySelector('#price_inside_buybox')?.textContent;
                if (buyPrice) prezzo = parsePrice(buyPrice);
            }

            // Prezzo originale con log
            let prezzoOriginale = null;
            let fonte = null;

            const selettori = [
                { sel: '.a-price.a-text-price span.a-offscreen', name: 'barrato' },
                { sel: '.priceBlockStrikePriceString', name: 'strike' },
                { sel: '.a-text-price span.a-offscreen', name: 'text-price' },
                { sel: '#price_inside_buybox .a-text-price span', name: 'buybox' },
                { sel: '.list-price', name: 'list-price' }
            ];
            for (let s of selettori) {
                const el = document.querySelector(s.sel);
                if (el) {
                    const val = parsePrice(el.textContent);
                    console.log(`🔍 Selettore ${s.name}: trovato ${val}`);
                    if (isPrezzoValido(val)) {
                        prezzoOriginale = val;
                        fonte = s.name;
                        break;
                    }
                }
            }

            if (!prezzoOriginale) {
                const rows = document.querySelectorAll('#productDetails_detailBullets_sections1 tr, .a-normal tr');
                for (let row of rows) {
                    const label = row.querySelector('th')?.textContent;
                    if (label && (label.includes('Prezzo consigliato') || label.includes('List Price') || label.includes('Prezzo di listino'))) {
                        const value = row.querySelector('td')?.textContent;
                        if (value) {
                            const val = parsePrice(value);
                            console.log(`🔍 Tabella dettagli: trovato ${val}`);
                            if (isPrezzoValido(val)) {
                                prezzoOriginale = val;
                                fonte = 'tabella';
                                break;
                            }
                        }
                    }
                }
            }

            if (!prezzoOriginale) {
                const script = document.querySelector('script[type="application/ld+json"]');
                if (script) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data.offers) {
                            if (data.offers.highPrice && isPrezzoValido(data.offers.highPrice)) {
                                prezzoOriginale = data.offers.highPrice;
                                fonte = 'json-ld high';
                            }
                        }
                    } catch (e) {}
                }
            }

            if (!prezzoOriginale) {
                const bodyText = document.body.innerText;
                const match = bodyText.match(/(?:Prezzo consigliato|List Price|Prezzo di listino)[:\s]*([€£$]?\s*[\d.,]+)/i);
                if (match) {
                    const val = parsePrice(match[1]);
                    console.log(`🔍 Testuale: trovato ${val}`);
                    if (isPrezzoValido(val)) {
                        prezzoOriginale = val;
                        fonte = 'testuale';
                    }
                }
            }

            // Se non trovato, lasciamo null (non usiamo default)

            let sconto = 0;
            if (prezzoOriginale && prezzo && prezzoOriginale > prezzo) {
                sconto = Math.round(((prezzoOriginale - prezzo) / prezzoOriginale) * 100);
            }

            const immagine = document.querySelector('#landingImage')?.src || '';
            const asin = document.querySelector('meta[name="asin"]')?.content || window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '';
            const disponibilita = document.querySelector('#availability span')?.textContent.trim() || '';
            const inStock = !disponibilita.toLowerCase().includes('non disponibile') && !disponibilita.toLowerCase().includes('esaurito');

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
        console.log('📦 Dati estratti finali:', JSON.stringify(dati, null, 2));
        return dati;
        
    } catch (error) {
        console.error('❌ Errore scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { estraiDatiDaLink };