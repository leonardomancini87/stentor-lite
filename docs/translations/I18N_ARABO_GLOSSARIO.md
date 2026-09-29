# Sténtor Lite — Arabo: note per la revisione

Prima versione completa (arabo standard moderno), da far rileggere a un madrelingua.

## Dove sono i testi
- `src/i18n/locales/ar.js` — tutti i testi dell'interfaccia.
- `src/utils/voiceMessages.ar.js` — voci/personaggi e riepilogo dell'importazione da Word.
- `I18N_ARABO_REVISIONE.csv` — tabella con italiano, inglese e arabo.

## Plurali
L'arabo ha più forme del plurale: oltre a `.one` e `.other` ci sono `.two` (duale, 2), `.few` (3–10) e `.many` (11–99).
Sono già scritte per i conteggi (مقطع / مقطعان / مقاطع / مقطعًا…); il test controlla i segnaposto anche in queste.

## Interfaccia da destra a sinistra
- Con l'arabo tutta l'interfaccia si specchia (barra laterale a destra, card a sinistra, pulsanti invertiti).
- Il testo delle battute, delle note e dei nomi prende la direzione dal proprio contenuto: un copione italiano resta leggibile.
- Le anteprime dello schermo non si specchiano, come la finestra di proiezione.
- Le frecce dei tasti (→ Avanti, ← Indietro) restano quelle predefinite: in arabo si possono invertire dalla card Scorciatoie.

## Scelte di terminologia da verificare
| Italiano | Arabo scelto | Dubbio |
|---|---|---|
| sopratitolo | ترجمة فوقية | Calco di "surtitle"; va bene per il teatro nella vostra area? |
| battuta | مقطع | "Segmento"; alternative: سطر, عبارة. |
| buio | إظلام | |
| Avanti / Indietro | التالي / السابق | |
| voce (chi parla) | الشخصية | "Personaggio". |
| atto / scena / quadro / intervallo | فصل / مشهد / لوحة / استراحة | |
| marcatore | علامة | |
| Mappa | المخطط | |
| Tempi | التوقيت | |
| recita | عرض | |
| audiodescrizione | الوصف الصوتي | |
