const express = require('express');
const cors = require('cors'); // Dodano za sigurnu vezu s web stranicom
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); // Omogućuje drugim aplikacijama da povuku podatke
app.use(express.json());

// Memorija za podatke
let zadnjiPodaci = { status: "Sustav online. Čekam prvo slanje sa stanice..." };

// SIGURNOST: Ključ više nije upisan ovdje, nego ga Render povlači iz skrivenih postavki
const API_KLJUC_ZA_KLIJENTA = process.env.MOJ_API_KLJUC;

// 1. RUTA ZA METEOSTANICU (POST)
app.post('/update-meteo', (req, res) => {
    console.log("Stigli podaci!");
    zadnjiPodaci = {
        ...req.body,
        vrijeme_zaprimanja: new Date().toLocaleString("hr-HR")
    };
    res.status(200).send("OK");
});

// 2. RUTA ZA PRIKAZ (GET)
app.get('/podaci', (req, res) => {
    const klijentovKljuc = req.header('X-API-KEY');

    if (!klijentovKljuc || klijentovKljuc !== API_KLJUC_ZA_KLIJENTA) {
        return res.status(401).json({ greska: "Neovlašten pristup." });
    }

    res.json(zadnjiPodaci);
});

app.listen(PORT, () => console.log(`API aktivan na portu ${PORT}`));
