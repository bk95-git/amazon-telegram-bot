const axios = require('axios');

async function pubblicaSuInstagram(offerta, tipoOfferta) {
    try {
        console.log('📸 Pubblicazione su Instagram...');

        const badge = tipoOfferta === 'errore'  ? '🔥 PROBABILE ERRORE 🔥' :
                      tipoOfferta === 'bomba'   ? '💣 BOMBA!!!' :
                                                  '💥 PREZZO CONVENIENZA';

        const caption = 
            `${badge}\n\n` +
            `${offerta.titolo}\n\n` +
            `💰 ${offerta.prezzo.toFixed(2).replace('.', ',')}€ invece di ${offerta.prezzoOriginale.toFixed(2).replace('.', ',')}€\n` +
            `🎯 SCONTO: ${offerta.sconto}%\n` +
            (offerta.hasCoupon ? `📍 PREZZO CON COUPON\n` : '') +
            `\n🛒 Link in bio!\n\n` +
            `#offerte #amazon #offertedelgiorno #risparmio #sconti #amazonia #deals`;

        // Step 1: crea il media container con l'immagine Amazon
        const mediaResponse = await axios.post(
            `https://graph.instagram.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
            {
                image_url: offerta.immagine,
                caption: caption,
                access_token: process.env.INSTAGRAM_ACCESS_TOKEN
            }
        );

        const creationId = mediaResponse.data.id;
        console.log('✅ Media caricato su Instagram, ID:', creationId);

        // Step 2: pubblica il media
        await axios.post(
            `https://graph.instagram.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`,
            {
                creation_id: creationId,
                access_token: process.env.INSTAGRAM_ACCESS_TOKEN
            }
        );

        console.log('✅ Pubblicato su Instagram!');
        return true;
    } catch (error) {
        console.error('❌ Errore Instagram:', error.response?.data || error.message);
        return false;
    }
}

module.exports = { pubblicaSuInstagram };