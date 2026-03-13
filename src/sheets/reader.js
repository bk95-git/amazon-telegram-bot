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
            // Assumendo che le intestazioni siano "Link" e "Pubblicato"
            if (row.Link && row.Pubblicato !== 'SI') {
                console.log(`✅ Trovato link da pubblicare: ${row.Link}`);
                return {
                    link: row.Link,
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

async function segnaComePubblicato(row) {
    try {
        row.Pubblicato = 'SI';
        row.DataPubblicazione = new Date().toLocaleString('it-IT');
        await row.save();
        console.log('✅ Riga segnata come pubblicata');
        return true;
    } catch (error) {
        console.error('❌ Errore aggiornamento riga:', error);
        return false;
    }
}

module.exports = { caricaLinkDaSheets, segnaComePubblicato };