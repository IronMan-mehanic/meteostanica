const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios'); // Dodano za pokupljanje JSON-a

const app = express();

// --- POSTAVKE ---
app.use(cors());
app.use(express.json());

// Povezivanje sa Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

// 1. Početna stranica
app.get('/', (req, res) => {
    res.send('Meteo API (Meteo-Servis) aktivan i budan!');
});

// 2. Primanje podataka sa stanice (POST ili GET za testiranje)
app.all('/podaci', async (req, res) => {
    const api_kljuc = req.query.api_kljuc || req.body.api_kljuc;
    const temp = req.query.temp || req.body.temp;
    const vlaga = req.query.vlaga || req.body.vlaga;

    if (api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan API ključ!" });
    }

    if (!temp || !vlaga) {
        return res.status(400).json({ success: false, message: "Nedostaju podaci (temp/vlaga)!" });
    }

    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ temperatura: temp, vlaga: vlaga }]);

    if (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ success: false, message: "Greška pri upisu u bazu!" });
    }

    res.json({ success: true, message: "Podatak uspješno arhiviran" });
});

// 3. Dohvat najnovijeg mjerenja (za Widget)
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        return res.status(500).json({ success: false, message: "Ne mogu dohvatiti podatke!" });
    }

    res.json(data);
});

// 4. Dohvat zadnjih 50 mjerenja (za Povijest/Grafikon)
app.get('/api/svi', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return res.status(500).json({ success: false, message: "Greška pri dohvatu povijesti!" });
    }

    res.json(data);
});

// 5. 🆕 NOVA RUTA: Pokupi JSON sa vanjskog servera (POST metodom)
app.post('/pokupi-json', async (req, res) => {
    try {
        // Provjera API ključa
        const api_kljuc = req.headers['x-api-key'] || req.body.api_kljuc;
        if (api_kljuc !== mojApiKljuc) {
            return res.status(403).json({ success: false, message: "Neovlašten pristup" });
        }

        // URL servera koji generira JSON
        const izvorniUrl = "https://izvorni-server.com/generiraj-json";

        // Podaci koje šalješ POST metodom (ako su potrebni)
        const podaciZaSlanje = req.body || {};

        // Pokupi JSON sa izvornog servera
        const response = await axios.post(izvorniUrl, podaciZaSlanje, {
            headers: {
                'Content-Type': 'application/json',
                // Dodaj druge headers ako su potrebni
            }
        });

        // Vrati odgovor klijentu
        res.json({
            success: true,
            data: response.data,
            message: "JSON uspješno pokupljen"
        });

    } catch (error) {
        console.error("Greška pri pokupljanju JSON-a:", error.message);
        res.status(500).json({ success: false, message: "Greška pri pokupljanju podataka" });
    }
});

// --- POKRETANJE ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
