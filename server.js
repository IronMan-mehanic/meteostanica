const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Omogućuje serveru da čita JSON podatke koje šalje stanica
app.use(express.json());

// Memorija za podatke (privremena, dok je server budan)
let zadnjiPodaci = { status: "Sustav online. Čekam prvo slanje sa stanice..." };

// TVOJ API KLJUČ (ovaj ključ daješ drugoj aplikaciji za prikaz)
const API_KLJUC_ZA_KLIJENTA = "moj-meteo-kljuc-2026";

// 1. RUTA ZA METEOSTANICU (Ovaj link daješ njima za POST slanje)
app.post('/update-meteo', (req, res) => {
    console.log("Stigli podaci sa stanice:", req.body);
    zadnjiPodaci = {
        ...req.body,
        vrijeme_zaprimanja: new Date().toLocaleString("hr-HR")
    };
    res.status(200).send("Podaci uspješno spremljeni");
});

// 2. RUTA ZA TVOJU WEB APLIKACIJU (Ovdje aplikacija povlači podatke)
app.get('/podaci', (req, res) => {
    const klijentovKljuc = req.header('X-API-KEY');

    if (!klijentovKljuc || klijentovKljuc !== API_KLJUC_ZA_KLIJENTA) {
        return res.status(401).json({ greska: "Neovlašten pristup. API ključ nije ispravan." });
    }

    res.json(zadnjiPodaci);
});

app.listen(PORT, () => console.log(`API aktivan na portu ${PORT}`));
