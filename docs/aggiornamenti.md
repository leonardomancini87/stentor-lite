# Aggiornamenti dall'app

Dalla 0.9.0 Sténtor Lite si aggiorna da solo: **Impostazioni → Aggiornamenti → Verifica aggiornamenti**.
All'avvio l'app controlla in silenzio. Se trova una versione nuova mette un pallino accanto a
«Impostazioni», ma la scarica e la installa solo quando lo sceglie chi la usa. Senza connessione
a internet non mostra nulla.

## Come funziona

- L'app legge `latest.json` dall'ultima Release pubblicata su GitHub
  (`releases/latest/download/latest.json`, vedi `src-tauri/tauri.conf.json` → `plugins.updater`).
- `latest.json` e i pacchetti di aggiornamento li prepara la procedura di pubblicazione
  (`.github/workflows/release.yml`), insieme ai soliti installatori.
- Ogni pacchetto è firmato con la **chiave degli aggiornamenti**. L'app contiene la chiave pubblica
  e installa solo pacchetti firmati con la chiave privata corrispondente.
- GitHub considera «ultima versione» solo le Release normali: per questo non sono più segnate
  come pre-release. Finché una Release è in bozza, nessuno la vede.
- Su macOS e Linux, a installazione finita, compare «Riavvia ora». Su Windows l'installatore
  chiude e riapre l'app da solo. Su Linux l'installazione di `.deb` e `.rpm` chiede la password
  di amministratore; l'`.AppImage` si aggiorna senza.

Il codice è in `src/hooks/useAppUpdates.js` (verifica, download, riavvio) e in
`src/components/DesktopPreferences.jsx` (riquadro Aggiornamenti).

## La chiave degli aggiornamenti (una volta sola)

È diversa dal certificato Apple. **Non perderla**: senza, le copie già installate non possono più
aggiornarsi da sole e servirebbe di nuovo un'installazione a mano. Conserva il file della chiave
e la sua password nel gestore di password.

1. Crea la chiave (ti chiede una password):

   ```bash
   npx tauri signer generate -w ~/.tauri/stentor-lite.key
   ```

2. Metti la chiave pubblica in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
   (è il contenuto di `~/.tauri/stentor-lite.key.pub`, una sola riga).

3. Aggiungi i due segreti al repository GitHub (Settings → Secrets and variables → Actions):

   ```bash
   gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/stentor-lite.key
   gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   ```

   Il secondo comando chiede la password scelta al punto 1.

Se manca la chiave privata o quella pubblica, la procedura di pubblicazione si ferma subito
con un messaggio che rimanda a questa pagina.

## Pubblicare una versione

1. Aggiorna il numero di versione (`package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml`, `src/lib/appVersion.js`) e `CHANGELOG.md`.
2. `git tag v0.9.1 && git push origin v0.9.1` (oppure Actions → «Pubblica Sténtor Lite»).
3. Controlla la bozza in Releases: oltre agli installatori deve esserci `latest.json`.
4. Lascia «Release label» su **None** (non «Pre-release») e la casella **Set as the latest release**
   attiva, poi premi **Publish release**: da quel momento le app installate trovano l'aggiornamento.
   Se GitHub indica ancora come ultima una versione precedente, l'app non vede quella nuova:
   si corregge con `gh release edit vX.Y.Z --latest`.

## Compilare in locale

`npm run desktop:build` firma anche i pacchetti di aggiornamento, quindi chiede la chiave:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/stentor-lite.key)" npm run desktop:build
```

Senza chiave (per esempio in una copia del repository) si possono escludere i pacchetti di aggiornamento:

```bash
npm run desktop:build -- --config '{"bundle":{"createUpdaterArtifacts":false}}'
```
