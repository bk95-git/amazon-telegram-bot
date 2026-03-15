const puppeteer = require('puppeteer');

async function generaTemplate(offerta, èErrore) {
  console.log('🎨 Generazione template...');
  
  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Arial&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');

        body {
          width: 1080px;
          height: 1080px;
          margin: 0;
          font-family: 'Arial', 'Noto Color Emoji', sans-serif;
          background: white;
        }
        .container { padding: 30px; }
        .badge {
          background: ${process.env.COLORE_PRIMARIO || '#FFD700'};
          padding: 25px;
          text-align: center;
          font-size: 40px;
          font-weight: bold;
          border-radius: 15px;
          margin-bottom: 30px;
          font-family: 'Arial', 'Noto Color Emoji', sans-serif;
        }
        .image-box {
          text-align: center;
          margin: 30px 0;
          height: 500px;
        }
        .image-box img {
          max-width: 600px;
          max-height: 500px;
          object-fit: contain;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: ${process.env.COLORE_SECONDARIO || '#003366'};
          text-align: center;
          margin: 30px 0;
          line-height: 1.4;
        }
        .price-container {
          background: #F5F5F5;
          padding: 40px;
          border-radius: 30px;
          margin: 30px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 40px;
          position: relative;
        }
        .current-price {
          font-size: 60px;
          font-weight: bold;
          color: #E53935;
          font-family: 'Arial', 'Noto Color Emoji', sans-serif;
        }
        .old-price {
          font-size: 40px;
          color: #666;
          text-decoration: line-through;
        }
        .discount-circle {
          background: ${process.env.COLORE_PRIMARIO || '#FFD700'};
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          margin-left: 20px;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        .footer {
          background: ${process.env.COLORE_SECONDARIO || '#003366'};
          color: white;
          padding: 25px;
          text-align: center;
          margin-top: 50px;
          border-radius: 15px;
        }
        .hashtags {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .channel {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .placeholder {
          background: #eee;
          width: 600px;
          height: 500px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #999;
          border-radius: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">
          ${èErrore ? '*** PROBABILE ERRORE ***' : '🌸 OFFERTA DI PRIMAVERA 🌸'}
        </div>
        
        <div class="image-box">
          ${offerta.immagine ? 
            `<img src="${offerta.immagine}" alt="prodotto">` : 
            `<div class="placeholder">IMMAGINE NON DISPONIBILE</div>`
          }
        </div>
        
        <div class="title">${offerta.titolo}</div>
        
        <div class="price-container">
          <span class="current-price">${offerta.prezzo.toFixed(2).replace('.', ',')}€</span>
          <span class="old-price">${offerta.prezzoOriginale.toFixed(2).replace('.', ',')}€</span>
          <div class="discount-circle">-${offerta.sconto}%</div>
        </div>
        
        <div class="footer">
          <div class="hashtags">#offerte #amazon ${èErrore ? '#erroreprezzo' : ''}</div>
          <div class="channel">@bk_OfferteSegrete</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1080, height: 1080 });
  
  const screenshot = await page.screenshot({ 
    type: 'png',
    fullPage: true 
  });
  
  await browser.close();
  console.log('✅ Template generato');
  return screenshot;
}

module.exports = { generaTemplate };