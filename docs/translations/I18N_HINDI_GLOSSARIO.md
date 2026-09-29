# Sténtor Lite — Hindi: note per la revisione

La traduzione in Hindi è una **prima versione** da far rileggere a un madrelingua.

## Dove sono i testi
- `src/i18n/locales/hi.js` — tutti i testi dell'interfaccia (circa 440), un file solo, ordinati per pagina.
  Ogni riga è `'chiave': 'testo',`: si cambia solo il testo tra apici, mai la chiave a sinistra.
- `src/utils/voiceMessages.hi.js` — voci/personaggi e riepilogo dell'importazione da Word.
- `I18N_HINDI_REVISIONE.csv` — gli stessi testi in tabella (chiave · italiano · inglese · hindi · correzione · note).

## Regole da rispettare
- **Segnaposto**: `{count}`, `{number}`, `{title}`, `{name}`, `{language}`… vanno lasciati identici (si possono spostare nella frase).
- **Formattazione**: `<b>…</b>` (grassetto) e `<icon/>` (icona) vanno mantenuti.
- **Plurali**: le chiavi che finiscono in `.one` / `.other` sono singolare e plurale.
- Dopo le correzioni: `npm test` controlla che non manchi nessuna chiave e che i segnaposto siano corretti.

## Scelte di terminologia da verificare
| Italiano | Inglese | Hindi scelto | Dubbio |
|---|---|---|---|
| sopratitolo | surtitle | सरटाइटल | Traslitterato. In alternativa उपशीर्षक (però significa "sottotitolo"). |
| battuta | cue | क्यू | Termine tecnico inglese traslitterato; plurale invariato. |
| schermo vuoto / buio | blackout | ब्लैकआउट | Traslitterato; alternativa: अंधेरा. |
| voce (chi parla) | voice / character | पात्र | "Personaggio". Va bene anche per CORO e NARRATORE? |
| atto / scena / quadro | act / scene / tableau | अंक / दृश्य / झाँकी | |
| intervallo | interval | मध्यांतर | |
| marcatore | marker | मार्कर | |
| recita | performance | प्रस्तुति | |
| mappa | map | मानचित्र | Alternativa: नक्शा, oppure मैप. |
| tempi | timing | समय | |
| strumenti | tools | टूल्स | Alternativa: उपकरण. |
| scorciatoie | shortcuts | शॉर्टकट | |
| salva / elimina / annulla | save / delete / cancel | सहेजें / हटाएँ / रद्द करें | Forme usate da macOS e Windows in Hindi. |
| Manuale / Registra / Riproduci | Manual / Record / Play | हाथ से / रिकॉर्ड / चलाएँ | |
| compagnia / collettivo | company / collective | नाट्य दल / समूह | |

## Da controllare anche a schermo
Se una scritta viene tagliata o va a capo male, segnala la chiave (o una foto dello schermo) e accorciamo il testo o allarghiamo il componente.
