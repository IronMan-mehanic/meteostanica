const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const mojApiKljuc = "moj-meteo-kljuc-2026";

const supabase = createClient(supabaseUrl, supabaseKey);

// --- GLOBALNA VARIJABLA ZA PRIKAZ UŽIVO ---
// Ovo služi da widget dobije podatke bez da svaki put mora "kopati" po arhivi (bazi)
let zadnjeMjerenje = {
    temperatura: "--",
    vlaga: "--",
    co2: "--",
    tlak: "--",
    vrijeme: "Čekam podatke..."
};

// 1. RUTA ZA PRIMANJE PODATAKA (Od stanice do servera)
app.post('/podaci', async (req, res) => {
    const podaci = req.body;

    if (podaci.api_kljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Neispravan ključ!" });
    }

    // AŽURIRANJE ZA PRIKAZ UŽIVO (Odmah ide u memoriju servera)
    zadnjeMjerenje = {
        temperatura: podaci.air_temperature,
        vlaga: podaci.air_humidity,
        co2: podaci.co2_concentration,
        tlak: podaci.barometric_pressure,
        vrijeme: new Date().toLocaleString('hr-HR')
    };

    // ARHIVIRANJE U BAZU (Samo za izvješća)
    const { error } = await supabase
        .from('mjerenja')
        .insert([{
            temperatura: podaci.air_temperature,
            vlaga: podaci.air_humidity,
            co2: podaci.co2_concentration,
            tlak: podaci.barometric_pressure
        }]);

    if (error) console.error("Arhiviranje nije uspjelo:", error);

    res.json({ success: true, message: "Podaci primljeni i proslijeđeni!" });
});

// 2. RUTA ZA WIDGET (Brzo čitanje iz memorije servera)
app.get('/api/najnoviji', (req, res) => {
    const zahtijevaniKljuc = req.query.api_kljuc;

    if (zahtijevaniKljuc !== mojApiKljuc) {
        return res.status(401).json({ success: false, message: "Ključ obavezan!" });
    }

    // Server ovdje ne ide u bazu, nego odmah vraća ono što ima u memoriji
    res.json(zadnjeMjerenje);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Meteo servis na portu ${PORT}`));
