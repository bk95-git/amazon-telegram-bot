const puppeteer = require('puppeteer');

async function estraiDatiDaLink(url) {
    console.log(`🔍 Estraggo dati da: ${url}`);
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'language', { get: () => 'it-IT' });
        Object.defineProperty(navigator, 'languages', { get: () => ['it-IT', 'it'] });
    });

    try {
        // Semplifica il link estraendo solo l'ASIN
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
        const urlPulito = asinMatch 
            ? `https://www.amazon.it/dp/${asinMatch[1]}` 
            : url;
        console.log(`🔗 URL semplificato: ${urlPulito}`);

        await page.goto(urlPulito, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('#productTitle', { timeout: 15000 });

        await page.waitForSelector('.a-price', { timeout: 10000 }).catch(() => {
            console.log('⚠️ Selettore .a-price non trovato, continuo comunque');
        });

        await new Promise(r => setTimeout(r, 6000));

        const htmlDebug = await page.evaluate(() => {
            const risultati = [];
            document.querySelectorAll('span, div, p, td, label').forEach(el => {
                const t = el.textContent.trim();
                if (
                    t.match(/\d+[,\.]\d{2}/) &&
                    (
                        t.includes('%') ||
                        t.includes('30gg') ||
                        t.includes('basso') ||
                        t.includes('consigliato') ||
                        t.includes('mediano') ||
                        t.toLowerCase().includes('coupon') ||
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
            function isPrezzUnitario(testo) {
                return testo.includes('/ kg') || testo.includes('/kg') ||
                       testo.includes('/ l)') || testo.includes('/l)') ||
                       testo.includes('/ pz') || testo.includes('/ pezzo') ||
                       testo.includes('/ 100') || testo.includes('/100 ml');
            }

            function parsePrice(testo) {
                if (!testo) return null;
                if (isPrezzUnitario(testo)) return null;
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

            // ── PREZZO COUPON ───────────────────────────────────────
            let prezzoCoupon = null;

            const selettoriCoupon = [
                '#couponBadgeRegularVpc',
                '#vpcButton',
                '.couponBadge',
                '#coupon-badge',
                'label[id*="coupon"]',
                'span[id*="coupon"]',
                '#apex_offerDisplay_desktop [class*="coupon"]',
                '#corePrice_desktop [class*="coupon"]'
            ];

            for (const sel of selettoriCoupon) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = parsePrice(el.textContent);
                    if (val && val > 1 && val < 5000) {
                        if (prezzo && val > prezzo / 2 && val < prezzo) {
                            prezzoCoupon = val;
                        } else if (prezzo && val <= prezzo / 2) {
                            prezzoCoupon = Math.round((prezzo - val) * 100) / 100;
                        }
                        if (prezzoCoupon) break;
                    }
                }
            }

            if (!prezzoCoupon) {
                const tuttiElementi = document.querySelectorAll('span, div, p, td, label');
                for (const el of tuttiElementi) {
                    const testo = el.textContent.trim();
                    if (
                        testo.length < 150 &&
                        (testo.toLowerCase().includes('prezzo del coupon') ||
                         testo.toLowerCase().includes('coupon price') ||
                         testo.toLowerCase().includes('con coupon') ||
                         testo.toLowerCase().includes('coupon:'))
                    ) {
                        const parent = el.parentElement;
                        const testoParent = parent?.textContent || '';
                        const matches = [...testoParent.matchAll(/(\d{1,4}[,\.]\d{2})/g)];
                        for (const match of matches) {
                            const val = parsePrice(match[1]);
                            if (val && val > 1 && val < 5000) {
                                if (prezzo && val > prezzo / 2 && val < prezzo) {
                                    prezzoCoupon = val;
                                } else if (prezzo && val <= prezzo / 2) {
                                    prezzoCoupon = Math.round((prezzo - val) * 100) / 100;
                                }
                                if (prezzoCoupon) break;
                            }
                        }
                        if (prezzoCoupon) break;
                    }
                }
            }

            if (prezzoCoupon) {
                console.log('🎟️ Prezzo coupon trovato:', prezzoCoupon);
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
                    const testoContesto = (el.parentElement?.textContent || '') + 
                                          (el.parentElement?.parentElement?.textContent || '');
                    if (isPrezzUnitario(testoContesto)) continue;

                    const val = parsePrice(el.textContent);
                    if (val && val > 1 && val < 5000 && prezzo && val > prezzo) {
                        prezzoOriginale = val;
                        break;
                    }
                }
                if (prezzoOriginale) break;
            }

            if (!prezzoOriginale) {
                const tuttiGliElementi = document.querySelectorAll('span, p, td, div');
                for (const el of tuttiGliElementi) {
                    const testo = el.textContent.trim();
                    if (isPrezzUnitario(testo)) continue;

                    if (
                        testo.includes('Prezzo consigliato') ||
                        testo.includes('List Price') ||
                        testo.includes('Prezzo più basso ultimi 30') ||
                        testo.includes('lowest price in the last 30') ||
                        testo.includes('Prezzo mediano') ||
                        testo.includes('Era:') ||
                        testo.includes('Was:') ||
                        testo.includes('Risparmi')
                    ) {
                        const matches = [...testo.matchAll(/(\d{1,4}[,\.]\d{2})/g)];
                        for (const match of matches) {
                            const val = parsePrice(match[1]);
                            if (val && val > 1 && val < 5000 && prezzo && val > prezzo) {
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

            if (!prezzoOriginale && scontoPercentuale && prezzo) {
                prezzoOriginale = Math.round((prezzo / (1 - scontoPercentuale / 100)) * 100) / 100;
            }

            const prezzoFinale = prezzoCoupon || prezzo;

            let sconto = 0;
            if (prezzoOriginale && prezzoFinale && prezzoOriginale > prezzoFinale) {
                sconto = Math.round(((prezzoOriginale - prezzoFinale) / prezzoOriginale) * 100);
            }

            const immagine = document.querySelector('#landingImage')?.src || 
                             document.querySelector('#imgBlkFront')?.src || '';

            const asin = document.querySelector('meta[name="asin"]')?.content || 
                         window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '';

            const disponibilita = document.querySelector('#availability span')?.textContent.trim() || '';
            const inStock = !disponibilita.toLowerCase().includes('non disponibile') && 
                            !disponibilita.toLowerCase().includes('esaurito');

            return { 
                titolo, 
                prezzo: prezzoFinale,
                prezzoOriginale, 
                sconto, 
                immagine, 
                asin, 
                inStock,
                hasCoupon: prezzoCoupon !== null,
                prezzoPrimaCoupon: prezzo
            };
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