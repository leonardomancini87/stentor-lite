# Sténtor Lite — Lingue nordiche e slave: note per la revisione

Prime versioni complete, da far rileggere a madrelingua (meglio se del mondo del teatro).

## Dove sono i testi
- `src/i18n/locales/sv.js`, `da.js`, `no.js`, `fi.js`, `pl.js`, `cs.js`, `sk.js`, `hr.js`, `sr.js`, `bg.js`, `ru.js`, `uk.js` — un file per lingua.
- `I18N_NORDICHE_SLAVE_REVISIONE.csv` — tutte le lingue affiancate a italiano e inglese, una riga per testo (con le forme plurali in più delle lingue slave).
- Testi su voci/personaggi: `src/utils/voiceMessages.js` (da, no, fi, pl, cs) e `src/utils/voiceMessages.more.js` (sv, sk, hr, sr, bg, ru, uk).

Stesse regole delle altre lingue: segnaposto (`{count}`, `{title}`…), `<b>…</b>` e `<icon/>` invariati; `npm test` controlla. Le lingue slave hanno le forme plurali della loro lingua (`.one`, `.few`, `.many`, `.other`).

## Scelte di terminologia
| Italiano | Svenska | Dansk | Norsk | Suomi |
|---|---|---|---|---|
| battuta | replik | replik | replikk | repliikki |
| sopratitolo | övertext | overtekst | overtekst | tekstitys |
| buio | Svart skärm | Blackout | Svart skjerm | Pimennys |
| marcatore | märke | markør | markør | merkintä |
| Mappa | Översikt | Oversigt | Oversikt | Kartta |
| Tempi | Tider | Tider | Tidtaking | Ajoitus |
| recita | föreställning | forestilling | forestilling | esityskerta |
| registro | du | du | du | sinä |

| Italiano | Polski | Čeština | Slovenčina | Hrvatski | Српски | Български | Русский | Українська |
|---|---|---|---|---|---|---|---|---|
| battuta | kwestia | replika | replika | replika | реплика | реплика | реплика | репліка |
| sopratitolo | napis | titulek | titulok | nadnaslov | надтитл | надпис | титр | супертитр |
| buio | Wygaszenie | Zatemnění | Zatemnenie | Zatamnjenje | Затамњење | Затъмнение | Затемнение | Затемнення |
| marcatore | znacznik | značka | značka | oznaka | ознака | маркер | метка | мітка |
| Mappa | Mapa | Mapa | Mapa | Pregled | Мапа | Карта | Карта | Мапа |
| Tempi | Czasy | Časování | Časovanie | Vrijeme | Тајминг | Хронометраж | Хронометраж | Хронометраж |
| recita | przedstawienie | představení | predstavenie | izvedba | извођење | представление | показ | показ |
| registro | ty | vy | vy | vi | ви | Вие | вы | ви |

Il serbo è in alfabeto cirillico.

## Punti da verificare con un madrelingua
- La parola per la singola battuta proiettata ("cue"): quasi ovunque è la parola teatrale per la battuta di dialogo (replik, kwestia, реплика…); chi fa sopratitoli potrebbe preferire la parola per "sopratitolo".
- Il sopratitolo stesso: in alcune lingue convivono più termini (титр/субтитры, titulky/nadtitulky, супертитри/субтитри, надтитл/титл).
- I nomi brevi delle sezioni Mappa e Tempi.
- Le frasi con un numero: dove la frase non ha le forme plurali, il numero è stato messo dopo i due punti o tra parentesi, per evitare accordi sbagliati.
- I nomi dei tasti (Enter, Delete, Home, End) sono rimasti come sulle tastiere di ciascun paese.
