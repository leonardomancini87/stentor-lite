# Sténtor Lite — Francese, tedesco, spagnolo, portoghese: note per la revisione

Prime versioni complete, da far rileggere a madrelingua (meglio se del mondo del teatro).

## Dove sono i testi
- `src/i18n/locales/fr.js`, `de.js`, `es.js`, `pt.js` — tutti i testi dell'interfaccia, un file per lingua.
- `I18N_FR_DE_ES_PT_REVISIONE.csv` — le quattro lingue affiancate a italiano e inglese, una riga per testo.
- I testi su voci/personaggi erano già tradotti in `src/utils/voiceMessages.js`.

Stesse regole delle altre lingue: segnaposto (`{count}`, `{title}`…), `<b>…</b>` e `<icon/>` invariati; `npm test` controlla.

## Scelte di terminologia
| Italiano | Français | Deutsch | Español | Português (PT) |
|---|---|---|---|---|
| sopratitolo | surtitre | Übertitel | sobretítulo | legenda |
| battuta | réplique | Einblendung | réplica | fala |
| buio / schermo vuoto | Noir | Blackout | Oscuro | Negro |
| Avanti / Indietro | Suivant / Précédent | Weiter / Zurück | Siguiente / Anterior | Seguinte / Anterior |
| marcatore | repère | Marke | marcador | marcador |
| Mappa | Plan | Übersicht | Mapa | Mapa |
| Tempi | Minutage | Zeiten | Tiempos | Tempos |
| Strumenti | Outils | Werkzeuge | Herramientas | Ferramentas |
| Scorciatoie | Raccourcis | Tastenkürzel | Atajos | Atalhos |
| recita | représentation | Vorstellung | función | récita |
| atto / scena / quadro / intervallo | acte / scène / tableau / entracte | Akt / Szene / Bild / Pause | acto / escena / cuadro / intermedio | ato / cena / quadro / intervalo |
| Schermi | Écrans | Bildschirme | Pantallas | Ecrãs |
| Impostazioni | Réglages | Einstellungen | Ajustes | Definições |

## Scelte di tono
- **Français**: vouvoiement; spazi insecabili prima di `: ; ! ?` e dentro « ».
- **Deutsch**: forma di cortesia (Sie); "Einblendung" per la singola battuta proiettata, "Übertitel" per il testo. Da verificare con chi fa Übertitelung.
- **Español**: tú (come macOS in spagnolo); spagnolo di Spagna ("ordenador").
- **Português**: portoghese europeo (ecrã, guião, ficheiro). Per il Brasile servirebbe una variante a parte (tela, roteiro, arquivo).
