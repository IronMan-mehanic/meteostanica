const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const mojApiKljuc = "moj-meteo-kljuc-2026";

// Globalna varijabla za widget (Prikaz uživo)
let zadnjeMjerenje = {
    temperatura: "--",
    vlaga: "--",
    co2: "--",
    tlak: "--",
    vrijeme: "Čekam stanicu..."
};

// RUTA ZA STANICU (Slanje podataka)
app.post('/podaci', async (req, res) => {
    const paket = req.body;

    if (paket.api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neovlašten pristup" });
    }

    // Izvlačenje podataka iz formata koji šalješ (vidi se na tvojoj slici)
    const noveVrijednosti = {
        temperatura: paket.air_temperature,
        vlaga: paket.air_humidity,
        co2: paket.co2_concentration,
        tlak: paket.barometric_pressure
    };

    // 1. Ažuriraj memoriju za Widget (Odmah)
    zadnjeMjerenje = {
        ...noveVrijednosti,
        vrijeme: new Date().toLocaleString('hr-HR')
    };

    // 2. Spremi u bazu (Arhiva/Izvješća)
    const { error } = await supabase.from('mjerenja').insert([noveVrijednosti]);

    if (error) {
        console.error("Baza greška:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: "Podaci primljeni i arhivirani!" });
});

// RUTA ZA WIDGET (Čitanje podataka)
app.get('/api/najnoviji', (req, res) => {
    if (req.query.api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan ključ" });
    }
    res.json(zadnjeMjerenje);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server aktivan na ${PORT}`));
