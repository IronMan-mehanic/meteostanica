const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

app.get('/', (req, res) => res.send('Univerzalni Meteo API aktivan!'));

// 1. DINAMIČKO POKUPLJANJE: Uzima sve iz JSON-a i sprema
app.all('/pokupi-json', async (req, res) => {
    try {
        const api_kljuc = req.headers['x-api-key'] || req.query.api_kljuc || req.body.api_kljuc;
        if (api_kljuc !== mojApiKljuc) return res.status(403).json({ success: false, message: "Neovlašteno" });

        const vanjskiUrl = req.query.url || req.body.url; 
        if (!vanjskiUrl) return res.status(400).json({ success: false, message: "Nedostaje URL izvora" });

        // 1. Dohvati vanjski JSON
        const response = await axios.get(vanjskiUrl);
        const podaciIzIzvora = response.data; // Ovdje su svi parametri (tlak, vjetar, lux, itd.)

        // 2. SPREMANJE SVEGA U BAZU
        // Supabase će automatski mapirati ključeve iz JSON-a u stupce tablice
        const { data, error } = await supabase
            .from('mjerenja')
            .insert([podaciIzIzvora]) // Šaljemo cijeli objekt bazi
            .select();

        if (error) {
            console.error("Greška baze:", error);
            return res.status(500).json({ 
                success: false, 
                message: "Baza ne podržava sve poslane parametre. Provjeri imena stupaca!",
                detalji: error.message 
            });
        }

        res.json({ success: true, poruka: "Svi parametri arhivirani", spremljeno: data[0] });

    } catch (err) {
        res.status(500).json({ success: false, greška: err.message });
    }
});

// 2. RUČNI UPIS SVIH PARAMETARA (preko Body-ja)
app.post('/podaci', async (req, res) => {
    const { api_kljuc, ...ostaliPodaci } = req.body;

    if (api_kljuc !== mojApiKljuc) return res.status(401).json({ success: false, message: "Krivi ključ" });

    const { data, error } = await supabase
        .from('mjerenja')
        .insert([ostaliPodaci])
        .select();

    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data: data[0] });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server radi na ${PORT}`));
