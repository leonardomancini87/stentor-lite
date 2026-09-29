# Sténtor Lite — Malayalam: note per la revisione

La traduzione in Malayalam è una **prima versione** da far rileggere a un madrelingua.

## Dove sono i testi
- `src/i18n/locales/ml.js` — tutti i testi dell'interfaccia (circa 440), un file solo, ordinati per pagina.
  Ogni riga è `'chiave': 'testo',`: si cambia solo il testo tra apici, mai la chiave a sinistra.
- `src/utils/voiceMessages.ml.js`: i testi su voci/personaggi e il riepilogo dell'importazione da Word.
- `I18N_MALAYALAM_REVISIONE.csv` — gli stessi testi in tabella (chiave · italiano · inglese · malayalam · note),
  comodo per rileggere in Excel/Numbers. Le correzioni si possono segnare nella colonna "correzione".

## Regole da rispettare
- **Segnaposto**: `{count}`, `{number}`, `{title}`, `{name}`, `{language}`… vanno lasciati identici (si possono spostare nella frase).
- **Formattazione**: `<b>…</b>` (grassetto) e `<icon/>` (icona) vanno mantenuti.
- **Plurali**: le chiavi che finiscono in `.one` / `.other` sono singolare e plurale.
- Dopo le correzioni: `npm test` controlla che non manchi nessuna chiave e che i segnaposto siano corretti.

## Scelte di terminologia da verificare
| Italiano | Inglese | Malayalam scelto | Dubbio |
|---|---|---|---|
| sopratitolo | surtitle | സർടൈറ്റിൽ | Traslitterato. In alternativa സബ്‌ടൈറ്റിൽ (più noto ma indica i sottotitoli). |
| battuta | cue | ക്യൂ | Termine tecnico inglese traslitterato, come si usa in regia. |
| schermo vuoto / buio | blackout | ബ്ലാക്കൗട്ട് | Traslitterato; alternativa: ഇരുട്ട്. |
| voce (chi parla) | voice / character | കഥാപാത്രം | "Personaggio". Per CORO o NARRATORE va bene? |
| atto / scena / quadro | act / scene / tableau | അങ്കം / രംഗം / ദൃശ്യം | Termini del teatro malayalam. |
| intervallo | interval | ഇടവേള | |
| marcatore | marker | മാർക്കർ | Traslitterato. |
| recita | performance | അവതരണം | |
| tempi | timing | സമയക്രമം | |
| strumenti | tools | ടൂളുകൾ | Alternativa: ഉപകരണങ്ങൾ. |
| scorciatoie | shortcuts | കുറുക്കുവഴികൾ | |
| salva | save | സേവ് ചെയ്യുക | Alternativa più formale: സംരക്ഷിക്കുക. |
| elimina | delete | ഇല്ലാതാക്കുക | |
| proiezione | projection | പ്രൊജക്ഷൻ | |
| Manuale / Registra / Riproduci | Manual / Record / Play | സ്വന്തമായി / റെക്കോർഡ് / പ്ലേ | "Manuale" reso come "da sé". |
| compagnia / collettivo | company / collective | നാടക സംഘം / കൂട്ടായ്മ | |

## Da controllare anche a schermo
Il Malayalam occupa spesso più spazio: se una scritta viene tagliata o va a capo male, segnala la chiave (o una foto dello schermo) e accorciamo il testo o allarghiamo il componente.
