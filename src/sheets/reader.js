const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

async function caricaLinkDaSheets() {
    try {
        console.log('📊 Leggo Google Sheets...');
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows(); // rows è un array di oggetti con metodo get()
        console.log(`📄 Trovate ${rows.length} righe nel foglio`);

        for (const row of rows) {
            const pubblicato = row.get('Pubblicato'); // metodo get() funziona
            const link = row.get('Link');
            if ((pubblicato !== 'SI') && link) {
                console.log(`✅ Trovato link da pubblicare: ${link}`);
                return { link, row };
            }
        }
        console.log('📭 Nessun link nuovo da pubblicare');
        return null;
    } catch (error) {
        console.error('❌ Errore lettura Google Sheets:', error.message);
        if (error.response) console.error('Dettaglio:', error.response.data);
        return null;
    }
}

async function segnaComePubblicato(row) {
    try {
        row.set('Pubblicato', 'SI');
        row.set('Data Pubblicazione', new Date().toLocaleString('it-IT'));
        await row.save();
        console.log('✅ Riga segnata come pubblicata');
        return true;
    } catch (error) {
        console.error('❌ Errore aggiornamento riga:', error);
        return false;
    }
}

module.exports = { caricaLinkDaSheets, segnaComePubblicato };