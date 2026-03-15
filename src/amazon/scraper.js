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

     // Aspetta che i prezzi siano caricati
     await page.waitForSelector('.a-price', { timeout: 10000 }).catch(() => {
     console.log('⚠️ Selettore .a-price non trovato, continuo comunque');
});

// Pausa extra per JavaScript dinamico di Amazon
await new Promise(r => setTimeout(r, 3000));
        // DEBUG TEMPORANEO - vediamo cosa vede il bot sulla pagina
        const htmlDebug = await page.evaluate(() => {
            const risultati = [];
            document.querySelectorAll('span, div, p, td').forEach(el => {
                const t = el.textContent.trim();
                if (
                    t.match(/\d+[,\.]\d{2}/) &&
                    (
                        t.includes('%') ||
                        t.includes('30gg') ||
                        t.includes('basso') ||
                        t.includes('consigliato') ||
                        t.includes('Era') ||
                        t.includes('Was') ||
                        t.includes('List') ||
                        t.includes('Risparmi')
                    ) &&
                    t.length < 150
                ) {
                    risultati.push(t);
                }
            });
            return [...new Set(risultati)].slice(0, 30);
        });
        console.log('🔎 DEBUG TESTI RILEVANTI:', JSON.stringify(htmlDebug, null, 2));

        const dati = await page.evaluate(() => {
            function parsePrice(testo) {
                if (!testo) return null;
                const pulito = testo.replace(/[^\d,\.]/g, '').trim();
                const normalizzato = pulito.replace(/\.(?=\d{3})/g, '').replace(',', '.');
                const match = normalizzato.match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            }

            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';

            // ── PREZZO ATTUALE ──────────────────────────────────────
            let prezzo = null;

            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,\s]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent?.replace(/[^\d]/g, '');
            if (intero && frazione) prezzo = parseFloat(intero + '.' + frazione);

            if (!prezzo) prezzo = parsePrice(document.querySelector('#price_inside_buybox')?.textContent);

            if (!prezzo) {
                const offscreen = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen');
                if (offscreen) prezzo = parsePrice(offscreen.textContent);
            }

            // ── PREZZO ORIGINALE ────────────────────────────────────
            let prezzoOriginale = null;

            const selettoriOriginale = [
                '#corePriceDisplay_desktop_feature_div .a-price.a-text-price span.a-offscreen',
                '#corePriceDisplay_desktop_feature_div .basisPrice span.a-offscreen',
                '.basisPrice .a-offscreen',
                '.a-price[data-a-strike="true"] .a-offscreen',
                '.a-price.a-text-price span.a-offscreen',
                '.priceBlockStrikePriceString',
                '#listPrice',
                '.a-text-price .a-offscreen',
                '[data-a-strike="true"] span.a-offscreen'
            ];

            for (const sel of selettoriOriginale) {
                const elementi = document.querySelectorAll(sel);
                for (const el of elementi) {
                    const val = parsePrice(el.textContent);
                    if (val && val > 0 && val < 5000) {
                        prezzoOriginale = val;
                        break;
                    }
                }
                if (prezzoOriginale) break;
            }

            // Metodo testo: "Prezzo più basso ultimi 30gg", "Era:", "Prezzo consigliato"
            if (!prezzoOriginale) {
                const tuttiGliElementi = document.querySelectorAll('span, p, td, div');
                for (const el of tuttiGliElementi) {
                    const testo = el.textContent.trim();
                    if (
                        testo.includes('Prezzo più basso ultimi 30') ||
                        testo.includes('lowest price in the last 30') ||
                        testo.includes('Prezzo consigliato') ||
                        testo.includes('List Price') ||
                        testo.includes('Era:') ||
                        testo.includes('Was:') ||
                        testo.includes('Risparmi')
                    ) {
                        const matches = [...testo.matchAll(/(\d{1,4}[,\.]\d{2})/g)];
                        for (const match of matches) {
                            const val = parsePrice(match[1]);
                            if (val && val > 0 && val < 5000) {
                                prezzoOriginale = val;
                                break;
                            }
                        }
                        if (prezzoOriginale) break;
                    }
                }
            }

            // Metodo badge sconto %
            let scontoPercentuale = null;
            const selettoriBadge = [
                '.savingsPercentage',
                '.a-badge-text',
                '#corePriceDisplay_desktop_feature_div .a-color-price',
                '#dealsAccordionRow .a-color-price',
                'span[class*="savingBadge"]',
                '#apex_offerDisplay_desktop span'
            ];

            for (const sel of selettoriBadge) {
                const elementi = document.querySelectorAll(sel);
                for (const el of elementi) {
                    const match = el.textContent.match(/-?\s*(\d+)\s*%/);
                    if (match) {
                        scontoPercentuale = parseInt(match[1]);
                        break;
                    }
                }
                if (scontoPercentuale) break;
            }

            // Calcola prezzo originale da sconto % se ancora null
            if (!prezzoOriginale && scontoPercentuale && prezzo) {
                prezzoOriginale = Math.round((prezzo / (1 - scontoPercentuale / 100)) * 100) / 100;
            }

            // Calcolo sconto finale
            let sconto = scontoPercentuale || 0;
            if (!sconto && prezzoOriginale && prezzo && prezzoOriginale > prezzo) {
                sconto = Math.round(((prezzoOriginale - prezzo) / prezzoOriginale) * 100);
            }

            const immagine = document.querySelector('#landingImage')?.src || 
                             document.querySelector('#imgBlkFront')?.src || '';

            const asin = document.querySelector('meta[name="asin"]')?.content || 
                         window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '';

            const disponibilita = document.querySelector('#availability span')?.textContent.trim() || '';
            const inStock = !disponibilita.toLowerCase().includes('non disponibile') && 
                            !disponibilita.toLowerCase().includes('esaurito');

            return { titolo, prezzo, prezzoOriginale, sconto, immagine, asin, inStock };
        });

        await browser.close();
        console.log('📦 Dati estratti:', JSON.stringify(dati, null, 2));
        return dati;
    } catch (error) {
        console.error('❌ Errore scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { estraiDatiDaLink };