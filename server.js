const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');

const app = express();

// --- POSTAVKE ---
app.use(cors());
app.use(express.json()); // Nužno za Postman Body (JSON)

// Povezivanje sa Supabase (Render Environment Variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

// 1. Provjera je li server živ
app.get('/', (req, res) => {
    res.send('Meteo API je online i spreman za rad!');
});

// 2. Slanje podataka (Postman: POST ili GET)
app.all('/podaci', async (req, res) => {
    // Čitamo ključ i podatke iz URL-a ili iz JSON Body-ja
    const api_kljuc = req.query.api_kljuc || req.body.api_kljuc;
    const temp = req.query.temp || req.body.temp;
    const vlaga = req.query.vlaga || req.body.vlaga;

    if (api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan API ključ!" });
    }

    if (!temp || !vlaga) {
        return res.status(400).json({ success: false, message: "Nedostaju podaci: temp i vlaga su obavezni." });
    }

    // Upis u bazu s povratnom informacijom (.select())
    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ temperatura: temp, vlaga: vlaga }])
        .select(); 

    if (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ success: false, message: "Baza odbija upis. Provjeri RLS postavke!" });
    }

    res.status(201).json({ success: true, message: "Podatak spremljen", data: data[0] });
});

// 3. Dohvat najnovijeg zapisa (Za Widget)
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        return res.status(500).json({ success: false, message: "Nema podataka ili je baza nedostupna." });
    }

    res.json(data);
});

// 4. Nova ruta za vanjski JSON (Sada s ispravnim rukovanjem greškama)
app.post('/pokupi-json', async (req, res) => {
    try {
        const api_kljuc = req.headers['x-api-key'] || req.body.api_kljuc;
        if (api_kljuc !== mojApiKljuc) {
            return res.status(403).json({ success: false, message: "Neovlašten pristup (Krivi API ključ)" });
        }

        // PAŽNJA: Ovo mora biti stvarni URL. Za test u Postmanu koristimo tvoj vlastiti najnoviji podatak
        const izvorniUrl = req.body.url_za_pokupljanje || `https://${req.get('host')}/api/najnoviji`;

        const response = await axios.get(izvorniUrl); // Koristimo GET jer većina API-ja tako daje podatke

        res.json({
            success: true,
            izvor: izvorniUrl,
            data: response.data
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Greška: " + error.message });
    }
});

// --- POKRETANJE ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
