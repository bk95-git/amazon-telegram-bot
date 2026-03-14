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
                const pulito = testo.replace(/[^\d,\.]/g, '').trim();
                // Gestisce formato italiano: 64,66 o 64.66
                const normalizzato = pulito.replace(',', '.');
                const match = normalizzato.match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            }

            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';

            // ── PREZZO ATTUALE ──────────────────────────────────────
            let prezzo = null;

            // Metodo 1: intero + frazione
            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent;
            if (intero && frazione) prezzo = parseFloat(intero + '.' + frazione);

            // Metodo 2: buybox
            if (!prezzo) prezzo = parsePrice(document.querySelector('#price_inside_buybox')?.textContent);

            // Metodo 3: core price display
            if (!prezzo) prezzo = parsePrice(document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole')?.textContent + '.' + document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-fraction')?.textContent);

            // ── PREZZO ORIGINALE ────────────────────────────────────
            let prezzoOriginale = null;

            // Lista completa di selettori per il prezzo barrato
            const selettoriOriginale = [
                '#corePriceDisplay_desktop_feature_div .a-price.a-text-price span.a-offscreen',
                '#corePriceDisplay_desktop_feature_div .basisPrice span.a-offscreen',
                '.a-price[data-a-strike="true"] .a-offscreen',
                '.basisPrice .a-offscreen',
                '.a-price.a-text-price span.a-offscreen',
                '.priceBlockStrikePriceString',
                '#listPrice',
                '#priceblock_dealprice',
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

            // Metodo alternativo: cerca "Risparmi" o "Prezzo consigliato"
            if (!prezzoOriginale) {
                const tuttoTesto = document.body.innerText;

                // Cerca pattern "Prezzo consigliato: €XX,XX"
                const matchListino = tuttoTesto.match(/Prezzo consigliato[:\s]+(?:EUR\s*)?(\d+[,\.]\d+)/i);
                if (matchListino) prezzoOriginale = parsePrice(matchListino[1]);

                // Cerca "Era: €XX,XX"
                if (!prezzoOriginale) {
                    const matchEra = tuttoTesto.match(/Era[:\s]+(?:EUR\s*)?(\d+[,\.]\d+)/i);
                    if (matchEra) prezzoOriginale = parsePrice(matchEra[1]);
                }
            }

            // Metodo: cerca percentuale sconto direttamente nel badge
            let scontoPercentuale = null;
            const badgeSconto = document.querySelector(
                '.a-badge-text, .savingsPercentage, [data-csa-c-type="widget"][class*="savings"] span'
            );
            if (badgeSconto) {
                const matchPct = badgeSconto.textContent.match(/(\d+)\s*%/);
                if (matchPct) scontoPercentuale = parseInt(matchPct[1]);
            }

            // Se ho lo sconto % ma non il prezzo originale, lo calcolo
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