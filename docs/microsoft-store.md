# Sténtor Lite sul Microsoft Store

Sul Microsoft Store Sténtor Lite è pubblicato come pacchetto **MSIX**. Il pacchetto lo firma
Microsoft, gratis: chi installa dallo Store non vede l'avviso «Windows ha protetto il PC» che
compare con l'installatore `.exe` scaricato dal sito, che non è firmato.

- Editore: **Leonardo Mancini** (account sviluppatore individuale su Partner Center).
- Nome riservato: **Sténtor Lite** · Store ID `9P3RVN3P8Q8R` ·
  pagina: https://apps.microsoft.com/detail/9P3RVN3P8Q8R
- Identità del pacchetto: in `src-tauri/windows/store/AppxManifest.xml`. Sono i valori di
  Partner Center → Sténtor Lite → Product management → Product identity: non vanno cambiati.

## Pubblicare una versione sullo Store

1. Pubblica prima la versione come sempre (Release su GitHub).
2. Actions → **Pacchetto Microsoft Store** → Run workflow, scegliendo il tag della versione.
3. A esecuzione finita scarica `stentor-lite-msix` da «Artifacts»: dentro c'è il file `.msix`.
4. Partner Center → Sténtor Lite → nuova submission → **Packages**: carica il `.msix`.
5. Invia. Microsoft rivede l'app prima di pubblicarla.

Il numero di versione del pacchetto è quello di `tauri.conf.json` più uno zero finale
(`0.9.2` → `0.9.2.0`): lo Store richiede che l'ultimo numero sia 0.

## Cosa cambia nella copia installata dallo Store

- **Aggiornamenti**: li fa Windows. L'app se ne accorge da sola (è installata in
  `Program Files\WindowsApps`), non cerca aggiornamenti e non mostra il riquadro
  Impostazioni → Aggiornamenti. Vedi `stentor_is_store_package` in `src-tauri/src/main.rs`
  e `src/hooks/useAppUpdates.js`.
- **Dati**: sono separati da quelli della copia installata con l'`.exe`. Chi passa da una
  all'altra porta i progetti con «Salva» e «Apri».
- **WebView2**: il pacchetto non lo contiene; usa quello di Windows (già presente su
  Windows 11 e sui Windows 10 aggiornati).

## Com'è fatto il pacchetto

`scripts/build-msix.ps1` prende `stentor.exe` (compilato con `npx tauri build --no-bundle`),
il manifesto e le icone di `src-tauri/windows/store/`, e li impacchetta con `makepri` e
`makeappx` del Windows SDK. Il pacchetto non è firmato, quindi non si installa con un doppio
clic: per provarlo su un PC serve la modalità sviluppatore e
`Add-AppxPackage -Register AppxManifest.xml` sulla cartella `msix/layout`.

Le icone in `src-tauri/windows/store/Assets/` sono ricavate da `src-tauri/icons/icon.png` e,
per le misure piccole, da `icon.ico`: vanno rigenerate se cambia l'icona dell'app.
