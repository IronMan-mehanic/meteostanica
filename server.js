const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = process.env.MOJ_API_KLJUC;

const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => res.send('Meteo API (JSONB verzija) aktivan!'));

// --- GLAVNA RUTA ZA SVE PODATKE ---
app.all('/podaci', async (req, res) => {
    // 1. Izvlačenje API ključa (iz URL-a ili Body-ja)
    const api_kljuc = req.query.api_kljuc || req.body.api_kljuc;
    
    // 2. Provjera ključa
    if (api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan API ključ!" });
    }

    // 3. Priprema podataka: Uzimamo SVE osim ključa i stavljamo u jedan objekt
    const { api_kljuc: izbaci, ...ostatakPodataka } = { ...req.query, ...req.body };

    if (Object.keys(ostatakPodataka).length === 0) {
        return res.status(400).json({ success: false, message: "Nema podataka za slanje!" });
    }

    // 4. UPIS U BAZU (U stupac 'podaci' koji je jsonb)
    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ podaci: ostatakPodataka }])
        .select();

    if (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ success: false, message: "Baza odbija upis!", detalji: error.message });
    }

    res.json({ success: true, message: "Podaci uspješno arhivirani u JSONB", spremljeno: data[0] });
});

app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return res.status(500).json({ success: false, message: "Nema podataka!" });
    res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));
