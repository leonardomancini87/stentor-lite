# Sténtor Lite sul Mac App Store

La copia per il Mac App Store è la stessa app del `.dmg`, con tre differenze:

- gira nella **sandbox** di macOS (obbligatoria sul Mac App Store): vede i propri dati, i file scelti
  in Apri/Salva e la cartella Download (`src-tauri/macos/AppStore.entitlements`);
- **non si aggiorna da sola**: gli aggiornamenti li fa l'App Store e il riquadro Aggiornamenti
  non compare (funzione `app-store` in `src-tauri/Cargo.toml`, comando `stentor_is_store_package`);
- è un'unica app «universal» (Apple Silicon e Intel), per macOS 11 e successivi.

Si compila e si carica con il workflow **«Pacchetto Mac App Store»**
(`.github/workflows/mac-app-store.yml`), configurazione in `src-tauri/tauri.appstore.conf.json`.

## Da fare una volta sola

Tutto con l'account Apple Developer già usato per firmare e notarizzare il `.dmg`.

1. **Certificati** — [developer.apple.com](https://developer.apple.com/account/resources/certificates/list) → Certificates → «+»:
   - **Apple Distribution** (firma l'app);
   - **Mac Installer Distribution** (firma il pacchetto `.pkg`).

   Per ciascuno serve una richiesta di firma: sul Mac, Accesso Portachiavi → Assistente Certificato →
   Richiedi un certificato da un'Autorità di Certificazione → «Salvata su disco». Scaricati i due
   certificati, doppio clic per metterli nel Portachiavi.
2. **Esportare i due certificati in un unico `.p12`** — Accesso Portachiavi → I miei certificati →
   selezionare entrambi (con la loro chiave) → tasto destro → Esporta 2 elementi → formato `.p12`,
   con una password.
3. **Identificativo dell'app** — Identifiers → «+» → App IDs → App, piattaforma macOS,
   Bundle ID **esplicito** `live.stentor.lite` (`identifier` di `src-tauri/tauri.appstore.conf.json`).
   Nessuna capability da attivare.

   Il Bundle ID della copia App Store è diverso da quello del `.dmg` (`it.tantanteatro.stentor`):
   viene dal dominio del sito, è legato a Lite (Sténtor Pro potrà usare `live.stentor.pro`) e non
   tocca il `.dmg`, i cui progetti salvati restano dove sono. Le due copie sono comunque separate:
   quella dell'App Store tiene i dati nella propria sandbox.
4. **Profilo** — Profiles → «+» → Distribution → **Mac App Store Connect** → l'App ID del punto 3 →
   il certificato Apple Distribution → scaricare il file `.provisionprofile`.
5. **L'app in App Store Connect** — [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
   App → «+» → Nuova app: piattaforma macOS, nome «Sténtor Lite», lingua principale, il Bundle ID
   del punto 3, SKU a piacere (per esempio `stentor-lite`).
6. **Chiave API per il caricamento** — App Store Connect → Utenti e accesso → Integrazioni →
   App Store Connect API → chiave con accesso **Developer**. Annotare Key ID e Issuer ID,
   scaricare il file `AuthKey_….p8` (si può scaricare una volta sola).
7. **Segreti del repository** — GitHub → Settings → Secrets and variables → Actions → New repository secret.
   Per copiare un file in base64, nel Terminale: `base64 -i nomefile | pbcopy`, poi incollare.

   | Segreto | Contenuto |
   |---|---|
   | `MAS_CERTIFICATES` | il `.p12` del punto 2, in base64 |
   | `MAS_CERTIFICATES_PASSWORD` | la sua password |
   | `MAS_PROVISION_PROFILE` | il `.provisionprofile` del punto 4, in base64 |
   | `APP_STORE_API_KEY_ID` | Key ID |
   | `APP_STORE_API_ISSUER_ID` | Issuer ID |
   | `APP_STORE_API_KEY` | il testo del file `.p8` (aprirlo con TextEdit e copiare tutto) |

   `APPLE_TEAM_ID` c'è già.

## A ogni versione

1. Actions → «Pacchetto Mac App Store» → Run workflow sul ramo `main` (10–20 minuti).
2. Dopo qualche minuto la build compare in App Store Connect → l'app → **TestFlight**. Installarla
   sul Mac con l'app TestFlight e provare almeno: apertura, Proiezione (anche su un secondo schermo),
   Apri e Salva progetto, immagine del progetto, Esporta, Stampa copione, link al sito dal menu.
   La sandbox può bloccare cose che nel `.dmg` funzionano: è il momento di scoprirlo.
3. Scheda «Distribuzione» della versione → scegliere la build → **Invia per la revisione**.

Il numero di build è quello dell'esecuzione del workflow, quindi cresce sempre: si può ricaricare
la stessa versione quante volte serve.

## La scheda sull'App Store (prima pubblicazione)

- Schermate Mac in 16:10: 1280×800, 1440×900, 2560×1600 o 2880×1800 (da 1 a 10).
- Descrizione, parole chiave, URL di supporto, **URL della privacy policy** (obbligatorio anche se
  l'app non raccoglie dati).
- Privacy dell'app: «Nessun dato raccolto».
- Classificazione per età (questionario), prezzo **Gratis**, Paesi.
- Unione europea: dichiarazione di «trader» ai sensi del Digital Services Act (Business →
  Informazioni sul trader). Chi si dichiara trader mostra indirizzo, telefono ed e-mail sulla scheda.
- Categoria: Produttività (dal `.app`, voce `category` di `tauri.conf.json`).
