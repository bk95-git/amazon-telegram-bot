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
                const match = testo.replace(/\./g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            }
            
            const titolo = document.querySelector('#productTitle')?.textContent.trim() || '';
            
            const intero = document.querySelector('.a-price-whole')?.textContent.replace(/[.,]/g, '');
            const frazione = document.querySelector('.a-price-fraction')?.textContent;
            let prezzo = null;
            if (intero && frazione) {
                prezzo = parseFloat(intero + '.' + frazione);
            }
            
            let prezzoOriginale = null;
            const prezzoBarrato = document.querySelector('.a-price.a-text-price span.a-offscreen');
            if (prezzoBarrato) {
                prezzoOriginale = parsePrice(prezzoBarrato.textContent);
            }
            
            let sconto = null;
            const scontoEl = document.querySelector('.savingsPercentage');
            if (scontoEl) {
                const match = scontoEl.textContent.match(/(\d+)%/);
                sconto = match ? parseInt(match[1]) : null;
            } else if (prezzoOriginale && prezzo) {
                sconto = Math.round(((prezzoOriginale - prezzo) / prezzoOriginale) * 100);
            }
            
            const immagine = document.querySelector('#landingImage')?.src || 
                            document.querySelector('.imgTagWrapper img')?.src || '';
            
            const asin = document.querySelector('meta[name="asin"]')?.content || 
                         window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || '';
            
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