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
        const rows = await sheet.getRows(); // rows è un array di oggetti Row (versione 5.x)
        console.log(`📄 Trovate ${rows.length} righe nel foglio`);

        // Log per debug: stampa le chiavi della prima riga
        if (rows.length > 0) {
            console.log('🔑 Chiavi disponibili nella prima riga:', Object.keys(rows[0]));
        }

        for (const row of rows) {
            // In versione 5.x, si usa row.get('NomeColonna')
            const pubblicato = row.get('Pubblicato');
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
        // In versione 5.x, si usa row.set('NomeColonna', valore)
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