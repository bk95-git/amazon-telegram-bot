const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function caricaLinkDaSheets(soloPrioritarie = false) {
    try {
        console.log('📊 Leggo Google Sheets...');

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        console.log(`📄 Trovate ${rows.length} righe nel foglio`);

        // Prima cerca sempre le prioritarie
        for (const row of rows) {
            const pubblicato = row.get('Pubblicato');
            const link = row.get('Link');
            const priorita = row.get('Priorità');
            if (pubblicato !== 'SI' && link && priorita === 'SI') {
                console.log(`🚨 Trovata offerta PRIORITARIA: ${link}`);
                return { link, row, prioritaria: true };
            }
        }

        // Se cerco solo prioritarie e non ce ne sono, esco
        if (soloPrioritarie) {
            console.log('📭 Nessuna offerta prioritaria');
            return null;
        }

        // Altrimenti prendi la prima normale
        for (const row of rows) {
            const pubblicato = row.get('Pubblicato');
            const link = row.get('Link');
            if (pubblicato !== 'SI' && link) {
                console.log(`✅ Trovato link da pubblicare: ${link}`);
                return { link, row, prioritaria: false };
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