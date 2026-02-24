const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');

const app = express();

// --- KONFIGURACIJA ---
app.use(cors()); // Omogućuje pristup tvojoj web stranici (widgetu)
app.use(express.json()); // Omogućuje serveru da čita JSON tijelo zahtjeva

// Dohvaćanje tajnih ključeva iz Render Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

// 1. HOME: Provjera radi li server (za Cron-job budilicu)
app.get('/', (req, res) => {
    res.send('Meteo API sustav je aktivan i budan!');
});

// 2. RUČNI UPIS: Slanje podataka izravno sa stanice (Postman/Uređaj)
app.all('/podaci', async (req, res) => {
    const api_kljuc = req.query.api_kljuc || req.body.api_kljuc;
    const temp = req.query.temp || req.body.temp;
    const vlaga = req.query.vlaga || req.body.vlaga;

    if (api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan API ključ!" });
    }

    if (!temp || !vlaga) {
        return res.status(400).json({ success: false, message: "Nedostaju podaci (temp/vlaga)." });
    }

    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ temperatura: temp, vlaga: vlaga }])
        .select();

    if (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ success: false, message: "Greška pri upisu u bazu!" });
    }

    res.json({ success: true, message: "Podatak uspješno arhiviran", data: data[0] });
});

// 3. AUTOMATSKO POKUPLJANJE: Dohvati JSON s drugog servera i spremi u bazu
app.post('/pokupi-json', async (req, res) => {
    try {
        const api_kljuc = req.headers['x-api-key'] || req.body.api_kljuc;
        if (api_kljuc !== mojApiKljuc) {
            return res.status(403).json({ success: false, message: "Neovlašten pristup" });
        }

        // URL s kojeg kupimo podatke (može se poslati u Body-ju ili koristiti default)
        const izvorniUrl = req.body.url_za_pokupljanje || "https://tvoj-izvor-podataka.com/api.json";

        // 1. Dohvaćanje podataka s vanjskog linka
        const response = await axios.get(izvorniUrl);
        const vanjskiPodaci = response.data;

        // 2. Izvlačenje vrijednosti (prilagodi nazive polja 'temp' i 'vlaga' izvoru)
        const tempZaBazu = vanjskiPodaci.temp || vanjskiPodaci.temperatura;
        const vlagaZaBazu = vanjskiPodaci.vlaga;

        if (!tempZaBazu || !vlagaZaBazu) {
            throw new Error("Vanjski JSON ne sadrži potrebna polja temp/vlaga");
        }

        // 3. Automatski upis u tvoju Supabase bazu
        const { data, error } = await supabase
            .from('mjerenja')
            .insert([{ temperatura: tempZaBazu, vlaga: vlagaZaBazu }])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: "Podaci uspješno pokupljeni i spremljeni u bazu",
            arhivirano: data[0]
        });

    } catch (error) {
        console.error("Greška u /pokupi-json:", error.message);
        res.status(500).json({ success: false, message: "Neuspješno: " + error.message });
    }
});

// 4. API ZA WIDGET: Dohvati zadnji podatak za prikaz na webu
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        return res.status(500).json({ success: false, message: "Nema podataka u bazi." });
    }

    res.json(data);
});

// --- POKRETANJE SERVERA ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Meteo API radi na portu ${PORT}`);
});
