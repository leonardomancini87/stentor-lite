# Novità · Changelog

Le versioni seguono la numerazione `MAGGIORE.MINORE.CORREZIONE`. Finché Sténtor Lite è in beta il numero maggiore resta 0.
*Versions follow `MAJOR.MINOR.PATCH`. While Sténtor Lite is in beta the major number stays at 0.*

## 0.10.2 — 9 ottobre 2026 · beta

- L'immagine di un progetto viene rimpicciolita prima di essere salvata (al massimo 640 pixel sul lato lungo): una foto grande non riempie più la memoria dell'app con l'errore «The quota has been exceeded».
- Se la memoria è comunque piena, il messaggio spiega cosa fare.

## 0.10.1 — 7 ottobre 2026 · beta

- Su Mac e Linux «Proiezione» apre davvero la finestra dello schermo: prima l'app installata rispondeva «Schermo di proiezione non aperto». Su Windows non cambia nulla.
- Con lo schermo già aperto, un altro clic su «Proiezione» lo riporta in primo piano senza ricaricarlo.
- Nella finestra di proiezione il suggerimento «Doppio clic: tutto schermo · Esc: esci» non compare più a tutto schermo; in finestra appare muovendo il mouse e sparisce dopo due secondi.

## 0.10.0 — 7 ottobre 2026 · beta

**Per la serata**
- Blocco spettacolo: il lucchetto nella barra delle battute ferma ogni modifica al copione (testo, note, aggiunta, taglio, unione, eliminazione, lingue, pulizia, sostituzioni, Annulla e Ripeti). Mandare in onda, cambiare lingua, schermo vuoto e cartelli restano attivi. Il blocco resta dopo un riavvio.
- Telecomandi da presentazione: «Avanti» e «Indietro» rispondono anche a Pag ↓ e Pag ↑, in regia e nella finestra di proiezione. Ogni azione può avere fino a tre tasti.
- Cartelli: nuova card in Sopratitoli con testi pronti («Intervallo», il titolo…) da mandare su tutti gli schermi al posto della battuta. Un altro clic, «Avanti» o lo schermo vuoto li tolgono.
- La regia riconosce uno schermo aperto anche dopo essere stata riavviata.
- Corretto: un «Avanti» dato nei tre secondi dopo l'apertura di uno schermo veniva sovrascritto dalla battuta precedente.

**Schermi**
- Passaggio tra battute: per ogni schermo si sceglie tra nessun effetto, dissolvenza, dissolvenza con stacco e scorrimento, con durata rapida, media o lenta. Il valore iniziale è quello di sempre (stacco, rapida). L'anteprima mostra l'effetto, con il pulsante «Prova».
- Schermata di prova: cornice, croce al centro, limiti del testo e una riga campione su tutti gli schermi, per allineare e mettere a fuoco il proiettore. Si spegne alla prima battuta.
- Una riga lunga, con uno spostamento orizzontale impostato, non esce più dallo schermo: viene riavvicinata quanto basta.
- «Centra» porta il testo al centro esatto dello schermo, anche in verticale; la posizione «Centro» è ora la metà esatta.
- L'anteprima usa il carattere scelto per lo schermo (prima mostrava sempre quello dell'interfaccia).
- Le tre card della pagina sono separate e alte uguali.

**Battute**
- A proiezione chiusa, un clic sul testo di una battuta lo modifica nel punto cliccato, senza mandarla in onda. Con uno schermo aperto il clic manda sempre in onda; il doppio clic resta valido.
- Eliminando una battuta non compare più la finestra di conferma: per qualche secondo resta l'avviso «Battuta eliminata · Annulla». Tolta la voce corrispondente in Impostazioni.
- «Prossima» ha lo stesso aspetto di «Attuale» ed è allineata a destra; resta visibile anche nelle finestre strette.

**Strumenti**
- Verifica: nuovo «Controllo larghezza sullo schermo», che segnala le righe che con carattere e larghezza di uno schermo verrebbero tagliate.
- Nuova scheda «Trova»: cerca e sostituisci nel testo delle battute, nella lingua di lavoro.

**Progetti**
- «Stampa copione» nelle azioni del progetto: scarica un documento con numero, voce, testo e nota di ogni battuta, da aprire nel browser per stampare o salvare in PDF.

**Interfaccia**
- La freccia che riduce la colonna destra è in alto, in tutte le pagine; in Sopratitoli le card di destra partono alla stessa altezza di quelle di sinistra.
- Modulo di feedback dall'aspetto più essenziale; la domanda aperta è ora «Raccontaci come lo usi».
- Scelta della lingua dell'interfaccia in ordine alfabetico per sigla (AR, BG, CS…).

## 0.9.2 — 6 ottobre 2026 · beta

**Schermi**
- Seconda lingua un po' più distanziata dal trattino: lo spazio sopra e sotto il trattino ora appare uguale.

**Battute**
- Dopo aver eliminato una battuta si torna all'elenco: la battuta successiva è selezionata, ma il suo editor non si apre più da solo.
- L'avviso di conferma dell'eliminazione ha la casella «Non mostrare questo avviso in futuro». Si può riattivare in Impostazioni → Interfaccia → «Chiedi conferma prima di eliminare una battuta». Una battuta eliminata si recupera sempre con Command/Ctrl+Z.

**Interfaccia**
- Meno spazio vuoto sotto la barra dei comandi (Indietro, Avanti…) e sotto la firma della barra laterale.
- La barra della finestra mostra il nome del progetto aperto, come Excel o Pages: su Mac solo il nome (per esempio «Macbett»), su Windows e Linux «Macbett — Sténtor Lite».

## 0.9.1 — 6 ottobre 2026 · beta

**Schermi**
- Due lingue sullo stesso schermo: in Schermi → Seconda lingua si sceglie una traduzione da proiettare sotto la prima, più piccola, dopo un breve trattino centrale. La dimensione si regola in Aspetto (dal 50% al 90% della prima, 70% di partenza).
- Le battute non tradotte nella seconda lingua mostrano solo la prima: il testo originale non viene ripetuto.
- L'elenco degli schermi e l'anteprima in regia mostrano entrambe le lingue (per esempio «IT · EN»).

**Barra laterale**
- Sotto il titolo del progetto non compare più «salvato localmente»: restano compagnia e numero di sopratitoli. I progetti continuano a salvarsi da soli.

## 0.9.0 — 6 ottobre 2026 · beta

**Aggiornamenti**
- Nuovo riquadro in Impostazioni → Aggiornamenti: «Verifica aggiornamenti» controlla se c'è una nuova versione, la scarica e la installa. Progetti e impostazioni restano al loro posto: dalle prossime versioni non serve più riscaricare l'app dal sito.
- All'avvio l'app controlla da sola, in silenzio: se c'è una versione nuova compare un pallino accanto a «Impostazioni». L'installazione parte solo quando la scegli.

## 0.8.2 — 5 ottobre 2026 · beta

**Sopratitoli**
- Il carattere predefinito dei sopratitoli è ora Atkinson Hyperlegible, incluso nell'app: il testo è identico su macOS, Windows e Linux. I progetti esistenti mantengono il carattere che avevano.
- Atkinson Hyperlegible e OpenDyslexic funzionano anche senza essere installati sul computer.

**Windows**
- Icona più nitida sulla barra delle applicazioni: versione a tinte nette per le dimensioni piccole, con una misura esatta per ogni scala dello schermo.

**Demo**
- L'Antigone usa un solo stile: peso normale per tutte le battute, senza grassetti né corsivi.
- Chi aveva già aperto l'app trova la demo aggiornata: la copia salvata viene sostituita quando la demo inclusa cambia.

**Avvio**
- La finestra compare solo a interfaccia pronta, senza il lampo iniziale.
- Su Windows la finestra si apre ingrandita, senza margini ai bordi.

## 0.8.1 — 5 ottobre 2026 · beta

**Installazione su Windows**
- L'installatore ha la grafica e l'icona di Sténtor Lite e si presenta nella lingua di Windows (20 lingue; in inglese per le altre).
- L'icona sulla barra delle applicazioni è più grande: il medaglione occupa tutto lo spazio disponibile.

**Linux**
- Prima versione per Linux, in prova: pacchetti `.deb`, `.rpm` e `.AppImage`, per processori Intel/AMD e ARM.

## 0.8.0 — 1 ottobre 2026 · beta

**Schermi**
- Il testo si può spostare liberamente sullo schermo, in orizzontale e in verticale: con due cursori o trascinandolo nell'anteprima. Lo schermo in sala segue in diretta; il pulsante «Centra» lo riporta al centro.
- L'anteprima della pagina Schermi ha le proporzioni vere (16:9 o 4:3), quindi il testo è nello stesso punto che si vede in sala.
- Cursori più fluidi: un gesto intero si annulla con un solo Cmd/Ctrl+Z, e il pannello non salta più mentre si muovono.
- Un progetto nuovo parte con un solo schermo, «Schermo 1». Tolto il pulsante «Test».

**Sopratitoli e lingue**
- Tasto destro su una lingua del progetto: impostala come principale, gestisci le lingue o eliminala (con conferma e Annulla).

**Aspetto**
- Intestazione uguale in tutte le pagine (Progetti, Sopratitoli, Schermi, Impostazioni), con gli stessi margini e un solo pulsante principale per pagina.
- In Progetti le schede si adattano alla larghezza della finestra.

**Installazione**
- L'app per Mac è firmata e notarizzata da Apple: non compare più il blocco di sicurezza al primo avvio.
- All'avvio la finestra compare subito alla dimensione finale, senza ridimensionarsi sotto gli occhi.

**Demo**
- La demo è ora «Antigone (demo)»: 22 battute da tre parti dell'Antigone di Sofocle, con cinque personaggi, coro, note di regia e tempi registrati, in italiano, inglese e francese. La traduzione è stata fatta per Sténtor Lite dal testo greco.

## 0.7.0 — settembre 2026 · prima versione pubblica

- Prima pubblicazione del codice con la licenza EUPL-1.2.
- Importazione da Word, Excel, CSV/TSV, PowerPoint, SRT, VTT, testo semplice e progetti di Sténtor Pro.
- Interfaccia in 25 lingue.
- App per macOS (Apple Silicon e Intel) e Windows.
