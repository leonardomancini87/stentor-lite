<p align="center">
  <img src="public/stentor-icon.png" alt="" width="96" height="96">
</p>

<h1 align="center">Sténtor Lite</h1>

<p align="center">
  Sopratitoli per il teatro dal vivo: prepara il testo, traducilo, proiettalo in sala.<br>
  <em>Surtitles for live theatre: prepare the text, translate it, project it in the hall.</em>
</p>

<p align="center">
  <a href="#italiano">Italiano</a> · <a href="#english">English</a>
</p>

---

## Italiano

Sténtor Lite è un programma gratuito e open source per gestire i sopratitoli di spettacoli dal vivo: prosa, opera, danza, conferenze. Funziona su macOS e Windows come app desktop, oppure nel browser.

### Cosa fa

- **Progetti**: archivio degli spettacoli, con copertina, compagnia e autore; apertura e salvataggio di file di progetto.
- **Importazione**: copioni Word (`.docx`), con riconoscimento di personaggi, battute, didascalie e marcatori; tabelle Excel o CSV (una colonna per lingua, più personaggio e note); presentazioni PowerPoint (una diapositiva per battuta); sottotitoli SRT e VTT, con i tempi; testo semplice; progetti di Sténtor Pro (`.stn`).
- **Scrittura**: elenco delle battute modificabile direttamente, divisione e unione, personaggi, note di regia, stili (grassetto, corsivo, colore, dimensione) su singole parole.
- **Lingue**: più traduzioni nello stesso progetto; ogni schermo può mostrare una lingua diversa.
- **Conduzione dal vivo**: Avanti, Indietro, Vai a (per numero, marcatore o testo), Buio; mappa dello spettacolo per atti e scene.
- **Schermi**: uno o più schermi di proiezione, ciascuno con carattere, dimensione, colori, posizione e formato; finestra di proiezione da spostare sul proiettore, con gli stessi tasti della regia.
- **Tempo**: cronometro della recita con durata di atti e scene; registrazione e riproduzione facoltative dei tempi delle battute.
- **Strumenti**: verifica del testo (righe troppo lunghe, testi mancanti, spazi) e pulizia automatica.
- **Scorciatoie da tastiera** personalizzabili.
- **Interfaccia in 25 lingue**: italiano, inglese, francese, tedesco, spagnolo, portoghese, svedese, danese, norvegese, finlandese, polacco, ceco, slovacco, croato, serbo, bulgaro, russo, ucraino, greco, turco, cinese semplificato e tradizionale, arabo, hindi, malayalam.

### Scaricare l'app

Le versioni per Mac (Apple Silicon e Intel) e Windows sono nella pagina **Releases** di questo repository.
Sono versioni beta non firmate: al primo avvio macOS e Windows mostrano un avviso di sicurezza (su Mac: clic destro sull'app → Apri; su Windows: Ulteriori informazioni → Esegui comunque).

### Avviarlo dal codice sorgente

Serve [Node.js](https://nodejs.org/) 22 o successivo.

```bash
npm ci
npm run dev
```

Poi apri l'indirizzo mostrato nel Terminale (di solito `http://localhost:5173/stentore-browser/`).

Per l'app desktop servono anche [Rust](https://www.rust-lang.org/tools/install) e i [prerequisiti di Tauri](https://v2.tauri.app/start/prerequisites/) per il tuo sistema:

```bash
npm run desktop:dev     # app desktop in sviluppo
npm run desktop:build   # pacchetto installabile per il tuo sistema
npm test                # test automatici
```

### Struttura

| Cartella | Contenuto |
| --- | --- |
| `src/` | interfaccia (React + Vite): `components/`, `hooks/`, `utils/`, `styles/` |
| `src/i18n/` | testi dell'interfaccia per chiave, un file per lingua o per area |
| `public/public-stage.html` | finestra dello schermo di proiezione |
| `src-tauri/` | app desktop (Tauri 2, Rust) |
| `tests/` | test (`node --test`) |
| `docs/translations/` | glossari e tabelle di revisione delle traduzioni |

### Contribuire

Segnalazioni e proposte sono benvenute nelle **Issues**; le modifiche al codice come **pull request**. Prima di inviare una pull request esegui `npm test`.
Chi parla una delle lingue dell'interfaccia può aiutare a rivedere le traduzioni: i materiali sono in `docs/translations/`.
Per suggerimenti sull'uso puoi scrivere anche a feedback@stentor.live, o usare la scheda Feedback nelle Impostazioni dell'app.

### Licenza

Il codice di Sténtor Lite è distribuito con la licenza **European Union Public Licence v. 1.2 (EUPL-1.2)**: puoi usarlo, studiarlo, modificarlo e ridistribuirlo, anche per uso commerciale; chi distribuisce una versione modificata deve renderne disponibile il codice sorgente con la stessa licenza (o una licenza compatibile indicata dalla EUPL). Il testo completo è nel file [`LICENSE`](LICENSE).

### Nome e logo

**Il nome «Sténtor» e il logo di Sténtor appartengono a Leonardo Mancini e non sono concessi con la licenza EUPL**, che riguarda solo il codice. Puoi dire che il tuo lavoro è «basato su Sténtor Lite», ma una versione modificata distribuita da altri deve avere un nome e un logo diversi. I dettagli sono in [`TRADEMARK.md`](TRADEMARK.md).

Sténtor Pro è un prodotto distinto e non fa parte di questo repository.

### Ringraziamenti

I primi prototipi di Sténtor sono nati nell'ambito del progetto di public engagement ETICA dell'Università di Torino (UniTO): grazie a chi li ha resi possibili.

---

## English

Sténtor Lite is a free, open-source application for managing surtitles in live performance: theatre, opera, dance, conferences. It runs on macOS and Windows as a desktop app, or in the browser.

### Features

- **Projects**: an archive of shows with cover image, company and author; open and save project files.
- **Import**: Word scripts (`.docx`), recognising characters, lines, stage directions and markers; Excel or CSV tables (one column per language, plus character and notes); PowerPoint presentations (one slide per cue); SRT and VTT subtitles, with timings; plain text; Sténtor Pro projects (`.stn`).
- **Writing**: an editable cue list, split and merge, characters, director's notes, per-word styles (bold, italic, colour, size).
- **Languages**: several translations in the same project; each screen can show a different language.
- **Live operation**: Next, Back, Go to (by number, marker or text), Blackout; a show map by acts and scenes.
- **Screens**: one or more projection screens, each with its own font, size, colours, position and aspect ratio; a projection window to move to the projector, answering the same keys as the main window.
- **Time**: a performance timer with act and scene durations; optional recording and playback of cue timings.
- **Tools**: text check (overlong lines, missing text, spacing) and automatic clean-up.
- Customisable **keyboard shortcuts**.
- **Interface in 25 languages**: Italian, English, French, German, Spanish, Portuguese, Swedish, Danish, Norwegian, Finnish, Polish, Czech, Slovak, Croatian, Serbian, Bulgarian, Russian, Ukrainian, Greek, Turkish, Simplified and Traditional Chinese, Arabic, Hindi, Malayalam.

### Download

Mac (Apple Silicon and Intel) and Windows builds are on this repository's **Releases** page.
They are unsigned beta builds: on first launch macOS and Windows show a security warning (Mac: right-click the app → Open; Windows: More info → Run anyway).

### Run from source

You need [Node.js](https://nodejs.org/) 22 or later.

```bash
npm ci
npm run dev
```

Then open the address printed in the terminal (usually `http://localhost:5173/stentore-browser/`).

The desktop app also needs [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your system:

```bash
npm run desktop:dev     # desktop app in development
npm run desktop:build   # installable package for your system
npm test                # automated tests
```

### Contributing

Bug reports and ideas are welcome in **Issues**; code changes as **pull requests**. Please run `npm test` before opening a pull request.
If you speak one of the interface languages, you can help review the translations: the material is in `docs/translations/`.
You can also write to feedback@stentor.live, or use the Feedback card in the app's Settings.

### Licence

Sténtor Lite's source code is released under the **European Union Public Licence v. 1.2 (EUPL-1.2)**: you may use, study, modify and redistribute it, including commercially; if you distribute a modified version you must make its source code available under the same licence (or a compatible licence listed in the EUPL). The full text is in [`LICENSE`](LICENSE).

### Name and logo

**The name "Sténtor" and the Sténtor logo belong to Leonardo Mancini and are not licensed under the EUPL**, which covers the code only. You may say your work is "based on Sténtor Lite", but a modified version distributed by others must use a different name and logo. See [`TRADEMARK.md`](TRADEMARK.md).

Sténtor Pro is a separate product and is not part of this repository.

### Acknowledgements

The first Sténtor prototypes were created within the ETICA public engagement project of the University of Turin (UniTO): thanks to everyone who made them possible.

---

Copyright © 2026 Leonardo Mancini · [www.stentor.live](https://www.stentor.live)
