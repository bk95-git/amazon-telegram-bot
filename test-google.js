require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function test() {
  console.log('📧 Email service account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log('📄 Spreadsheet ID:', process.env.SPREADSHEET_ID);
  console.log('🔑 Private key (primi 50 caratteri):', process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.substring(0,50) + '...' : '❌ NON DEFINITA');

  if (!process.env.GOOGLE_PRIVATE_KEY) {
    console.error('❌ ERRORE: GOOGLE_PRIVATE_KEY non definita nel file .env');
    return;
  }

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

  try {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    console.log('✅ Autenticazione riuscita!');

    await doc.loadInfo();
    console.log('📊 Titolo foglio:', doc.title);

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    console.log(`📄 Trovate ${rows.length} righe`);

    if (rows.length > 0) {
      console.log('Prima riga:', rows[0]._rawData);
    } else {
      console.log('⚠️ Il foglio è vuoto');
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
    if (error.response) {
      console.error('Dettaglio risposta:', error.response.data);
    }
  }
}

test();