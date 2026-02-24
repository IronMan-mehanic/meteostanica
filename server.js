const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Povezivanje na Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- RUTE ---

app.get('/', (req, res) => res.send('Server je aktivan!'));

// 1. RUTA ZA UPIS (Stanica -> Server -> Baza)
app.all('/podaci', async (req, res) => {
    const api_kljuc = req.query.api_kljuc || req.body.api_kljuc;
    const temp = req.query.temp || req.body.temp;
    const vlaga = req.query.vlaga || req.body.vlaga;

    if (api_kljuc !== mojApiKljuc) return res.status(401).json({ success: false, message: "Krivi API ključ" });

    // POKUŠAJ UPISA
    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ temperatura: temp, vlaga: vlaga }])
        .select();

    if (error) {
        console.error("DETALJNA GREŠKA BAZE:", error); // Ovo ćeš vidjeti u Render logovima
        return res.status(500).json({ success: false, poruka_greške: error.message });
    }

    res.json({ success: true, spremljeno: data[0] });
});

// 2. RUTA ZA POKUPLJANJE (Dohvati JSON -> Spremi u Bazu)
app.all('/pokupi-json', async (req, res) => {
    try {
        const api_kljuc = req.query.api_kljuc || req.body.api_kljuc || req.headers['x-api-key'];
        if (api_kljuc !== mojApiKljuc) return res.status(403).json({ success: false, message: "Neovlašteno" });

        const vanjskiUrl = req.query.url || "https://api.vjestic.com/meteo/test"; // Primjer
        const response = await axios.get(vanjskiUrl);
        
        // PAŽNJA: Prilagodi ove nazive prema onome što dobivaš iz vanjskog JSON-a
        const temp = response.data.temp || response.data.temperatura;
        const vlaga = response.data.vlaga;

        // AUTOMATSKO SPREMANJE U BAZU
        const { data, error } = await supabase
            .from('mjerenja')
            .insert([{ temperatura: temp, vlaga: vlaga }])
            .select();

        if (error) throw error;

        res.json({ success: true, poruka: "Pokupljeno i spremljeno", podaci: data[0] });
    } catch (err) {
        console.error("GREŠKA PRI POKUPLJANJU:", err.message);
        res.status(500).json({ success: false, greška: err.message });
    }
});

// 3. RUTA ZA WIDGET (Dohvati iz baze)
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Radi na ${PORT}`));
