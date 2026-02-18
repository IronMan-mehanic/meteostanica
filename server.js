const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

// Povezivanje sa Supabase koristeći varijable koje si postavio na Renderu
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Glavna ruta koja prihvaća i POST (sa stanice) i GET (preko linka)
app.all('/podaci', async (req, res) => {
    // Uzmi podatke ili iz tijela poruke (POST) ili iz linka (GET/Query)
    const api_kljuc = req.body.api_kljuc || req.query.api_kljuc;
    const podaci = req.body.podaci || req.query;

    console.log("Stigao zahtjev. Provjera ključa...");

    // Provjera API ključa
    if (api_kljuc !== process.env.MOJ_API_KLJUC) {
        console.log("Pogrešan API ključ!");
        return res.status(403).send('Odbijeno: Pogrešan API ključ');
    }

    console.log("Ključ ispravan. Šaljem u Supabase:", podaci);

    // Slanje u tablicu 'mjerenja' u stupac 'podaci'
    const { data, error } = await supabase
        .from('mjerenja')
        .insert([{ podaci: podaci }]);

    if (error) {
        console.error("Greška pri spremanju u Supabase:", error);
        return res.status(500).send('Greška pri spremanju: ' + error.message);
    }

    res.send('Podatak uspješno arhiviran!');
});

// Osnovna poruka kad se otvori početna stranica
app.get('/', (req, res) => {
    res.send('Meteo API server je aktivan i čeka podatke.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Sustav aktivan na portu ${PORT}`);
});
