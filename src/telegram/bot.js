const { Bot, InputFile } = require('grammy');
const { generaTemplate } = require('../templates/generator');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

async function pubblicaOfferta(offerta, èErrore) {
  console.log('📦 DATI RICEVUTI in pubblicaOfferta:', JSON.stringify(offerta));
  try {
    console.log('📤 Pubblicazione su Telegram...');
    
    const template = await generaTemplate(offerta, èErrore);
    
    const caption = `
<b>${èErrore ? '🔥 PROBABILE ERRORE 🔥' : '⚡ OFFERTA SPECIALE ⚡'}</b>

${offerta.titolo}

💰 <b>${offerta.prezzo.toFixed(2).replace('.', ',')}€</b> invece di ${offerta.prezzoOriginale.toFixed(2).replace('.', ',')}€
🎯 SCONTO: <b>${offerta.sconto}%</b>

<a href="${offerta.link}">🛒 ACQUISTA SU AMAZON</a>

#offerte #amazon ${èErrore ? '#erroreprezzo' : ''}
    `;

    await bot.api.sendPhoto(process.env.TELEGRAM_CHANNEL_ID, 
      new InputFile(template), {
      caption: caption.trim(),
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