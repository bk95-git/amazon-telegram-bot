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
        const rows = await sheet.getRows();

        console.log(`📄 Trovate ${rows.length} righe nel foglio`);

        for (const row of rows) {
            if (row.get('Pubblicato') !== 'SI' && row.get('Link')) {
                console.log(`✅ Trovato link da pubblicare: ${row.get('Link')}`);
                return {
                    link: row.get('Link'),
                    row: row
                };
            }
        }

        console.log('📭 Nessun link nuovo da pubblicare');
        return null;

    } catch (error) {
        console.error('❌ Errore lettura Google Sheets:', error.message);
        return null;
    }
}

async function segnaComePubblicato(row, stato = 'SI') {
    try {
        row.set('Pubblicato', stato);
        if (stato === 'SI') {
            row.set('Data Pubblicazione', new Date().toLocaleString('it-IT'));
        }
        await row.save();
        console.log(`✅ Riga segnata come ${stato}`);
        return true;
    } catch (error) {
        console.error('❌ Errore aggiornamento riga:', error);
        return false;
    }
}

module.exports = { caricaLinkDaSheets, segnaComePubblicato };