const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');

const app = express();

// --- KONFIGURACIJA ---
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

app.get('/', (req, res) => {
    res.send('Profesionalni Univerzalni Meteo API je online!');
});

// GLAVNA RUTA ZA POKUPLJANJE SVEGA (JSON Fetch & Store)
app.all('/pokupi-json', async (req, res) => {
    try {
        // 1. Provjera ovlasti
        const api_kljuc = req.headers['x-api-key'] || req.query.api_kljuc || req.body.api_kljuc;
        if (api_kljuc !== mojApiKljuc) {
            return res.status(403).json({ success: false, message: "Neovlašten pristup" });
        }

        // 2. URL s kojeg uzimamo podatke
        const izvorniUrl = req.query.url || req.body.url;
        if (!izvorniUrl) {
            return res.status(400).json({ success: false, message: "Nedostaje URL izvora podataka" });
        }

        // 3. Dohvaćanje kompletnog JSON-a
        const response = await axios.get(izvorniUrl);
        const kompletniPodaci = response.data; // Ovdje je SVE što JSON sadrži

        // 4. AUTOMATSKO SPREMANJE CIJELOG OBJEKTA U BAZU
        // Supabase će automatski upisati podatke u stupce koji se zovu isto kao polja u JSON-u
        const { data, error } = await supabase
            .from('mjerenja')
            .insert([kompletniPodaci]) 
            .select();

        if (error) {
            console.error("Greška baze:", error.message);
            return res.status(500).json({ 
                success: false, 
                message: "Baza ne može prihvatiti podatke. Provjeri jesu li stupci kreirani u Supabaseu!",
                detalji: error.message 
            });
        }

        res.json({
            success: true,
            message: "Svi parametri su uspješno arhivirani",
            spremljeni_podaci: data[0]
        });

    } catch (err) {
        console.error("Greška sustava:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// RUTA ZA DOHVAT (Widget)
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return res.status(500).json({ success: false, message: "Nema podataka." });
    res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Univerzalni API radi na ${PORT}`));
