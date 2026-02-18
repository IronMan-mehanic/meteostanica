const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());

// Jednostavan logging middleware (vidiš svaki zahtjev u logovima)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Povezivanje sa Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- RUTE ---

// 1. Primanje podataka (sa stanice ili linka)
app.all('/podaci', async (req, res) => {
    const api_kljuc = req.body.api_kljuc || req.query.api_kljuc;
    const podaci = req.body.podaci || { ...req.query };
    
    // Čistimo api_kljuc iz samih podataka da ne ide u bazu
    delete podaci.api_kljuc;

    // Validacija
    if (api_kljuc !== process.env.MOJ_API_KLJUC) {
        return res.status(403).json({ success: false, message: 'Neovlašten pristup' });
    }

    if (Object.keys(podaci).length === 0) {
        return res.status(400).json({ success: false, message: 'Nema podataka za spremanje' });
    }

    // Dodajemo timestamp ručno za svaki slučaj
    const paketZaSpremanje = {
        podaci: podaci,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('mjerenja')
        .insert([paketZaSpremanje]);

    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Podatak uspješno arhiviran' });
});

// 2. Endpoint za widget (Vraća samo zadnje mjerenje)
app.get('/api/najnoviji', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0] || { message: "Nema podataka" });
});

// 3. Endpoint za povijest (Vraća zadnjih 50 mjerenja)
app.get('/api/svi', async (req, res) => {
    const { data, error } = await supabase
        .from('mjerenja')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Početna stranica
app.get('/', (req, res) => {
    res.json({ status: "Online", projekt: "Meteo Arhiva API" });
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Interna greška servera' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Meteo API aktivan na portu ${PORT}`);
});
