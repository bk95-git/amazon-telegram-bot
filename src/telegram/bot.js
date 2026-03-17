const { Bot, InputFile } = require('grammy');
const { generaTemplate } = require('../templates/generator');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

async function pubblicaOfferta(offerta, tipoOfferta) {
    console.log('📦 DATI RICEVUTI in pubblicaOfferta:', JSON.stringify(offerta));
    try {
        console.log('📤 Pubblicazione su Telegram...');
        const template = await generaTemplate(offerta, tipoOfferta);

        const badge = tipoOfferta === 'errore'      ? '🔥 PROBABILE ERRORE 🔥' :
                      tipoOfferta === 'bomba'        ? '💣 BOMBA!!!' :
                                                       '💥 PREZZO CONVENIENZA';

        const rigaCoupon = offerta.hasCoupon 
            ? `📍 <b>PREZZO CON COUPON</b> (prezzo normale: ${offerta.prezzoPrimaCoupon.toFixed(2).replace('.', ',')}€)\n`
            : '';

        const caption = `
<b>${badge}</b>

${offerta.titolo}

💰 <b>${offerta.prezzo.toFixed(2).replace('.', ',')}€</b> invece di ${offerta.prezzoOriginale.toFixed(2).replace('.', ',')}€
${rigaCoupon}🎯 SCONTO: <b>${offerta.sconto}%</b>

<a href="${offerta.link}">🛒 ACQUISTA SU AMAZON</a>

#offerte #amazon ${tipoOfferta === 'errore' ? '#erroreprezzo' : ''}
        `.trim();

        await bot.api.sendPhoto(process.env.TELEGRAM_CHANNEL_ID, new InputFile(template), {
            caption,
            parse_mode: 'HTML'
        });

        console.log('✅ Pubblicato:', offerta.titolo.substring(0, 50));
        return true;
    } catch (error) {
        console.error('❌ Errore pubblicazione:', error.message);
        return false;
    }
}

module.exports = { bot, pubblicaOfferta };