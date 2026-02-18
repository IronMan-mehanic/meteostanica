const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); // Ovo je novi "alat" za bazu
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Povezivanje na Supabase pomoću varijabli koje si unio u Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const API_KLJUC_ZA_KLIJENTA = process.env.MOJ_API_KLJUC;

// 1. RUTA ZA METEOSTANICU - Sada sprema podatke u bazu!
app.post('/update-meteo', async (req, res) => {
    console.log("Podaci stigli, šaljem u Supabase arhivu...");
    
    // Ova linija sprema cijeli paket podataka u kolonu 'podaci'
    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ podaci: req.body }]);

    if (error) {
        console.error("Greška pri spremanju:", error);
        return res.status(500).json(error);
    }
    
    res.status(200).send("Podatak uspješno arhiviran!");
});

// 2. RUTA ZA IZVJEŠĆA - Povlači sve iz baze za tvoj Excel
app.get('/izvjesce', async (req, res) => {
    const klijentovKljuc = req.header('X-API-KEY');
    if (klijentovKljuc !== API_KLJUC_ZA_KLIJENTA) return res.status(401).send("Odbijeno");

    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json(error);
    res.json(data);
});

// 3. RUTA ZA ZADNJI PODATAK (Widget)
app.get('/podaci', async (req, res) => {
    const klijentovKljuc = req.header('X-API-KEY');
    if (klijentovKljuc !== API_KLJUC_ZA_KLIJENTA) return res.status(401).send("Odbijeno");

    const { data, error } = await supabase
        .from('mjerenja')
        .select('podaci')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data.length) return res.status(404).send("Nema podataka");
    res.json(data[0].podaci);
});

app.listen(PORT, () => console.log(`Sustav aktivan na portu ${PORT}`));
