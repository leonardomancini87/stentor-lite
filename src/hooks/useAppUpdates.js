import { useCallback, useEffect, useRef, useState } from 'react';

// Aggiornamenti dell'app desktop (plugin updater di Tauri). L'app controlla da sola poco dopo
// l'avvio, in silenzio: se c'è una versione nuova lo segnala in Impostazioni e nella barra
// laterale, ma scarica e installa solo quando lo sceglie chi la usa (mai durante uno spettacolo).
// Nella versione browser non fa nulla. Nemmeno nella copia installata dal Microsoft Store:
// lì gli aggiornamenti li fa Windows, e il riquadro Aggiornamenti non compare.

const STARTUP_CHECK_DELAY_MS = 4000;

export const isDesktopApp = () => typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

// Chiede all'app se è installata dal Microsoft Store. Se la domanda fallisce vale «no».
const isStorePackage = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return (await invoke('stentor_is_store_package')) === true;
  } catch {
    return false;
  }
};

// status: idle | checking | upToDate | available | downloading | installing | ready | checkError | installError
export default function useAppUpdates() {
  const [state, setState] = useState({ status: 'idle', version: null, progress: null });
  // null finché non si sa da dove è stata installata l'app; poi true (Store) o false.
  const [storeManaged, setStoreManaged] = useState(null);
  const updateRef = useRef(null);
  const busyRef = useRef(false);
  const selfUpdating = isDesktopApp() && storeManaged === false;

  const check = useCallback(async ({ silent = false } = {}) => {
    if (!selfUpdating || busyRef.current) return;
    busyRef.current = true;
    if (!silent) setState({ status: 'checking', version: null, progress: null });
    try {
      const { check: checkForUpdate } = await import('@tauri-apps/plugin-updater');
      const update = await checkForUpdate();
      updateRef.current = update;
      if (update) {
        setState({ status: 'available', version: update.version, progress: null });
      } else if (!silent) {
        setState({ status: 'upToDate', version: null, progress: null });
      }
    } catch (error) {
      console.warn('Sténtor: verifica aggiornamenti non riuscita', error);
      // Senza rete all'avvio non si mostra nulla: l'errore compare solo se la verifica è richiesta.
      if (!silent) setState({ status: 'checkError', version: null, progress: null });
    } finally {
      busyRef.current = false;
    }
  }, [selfUpdating]);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update || busyRef.current) return;
    busyRef.current = true;
    let total = 0;
    let received = 0;
    setState((current) => ({ ...current, status: 'downloading', progress: null }));
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          received += event.data.chunkLength;
          if (total > 0) {
            const progress = Math.min(100, Math.round((received / total) * 100));
            setState((current) => ({ ...current, progress }));
          }
        } else if (event.event === 'Finished') {
          setState((current) => ({ ...current, status: 'installing', progress: null }));
        }
      });
      // Su Windows l'installatore chiude e riapre l'app da solo; su macOS e Linux serve il riavvio.
      setState((current) => ({ ...current, status: 'ready', progress: null }));
    } catch (error) {
      console.warn('Sténtor: installazione aggiornamento non riuscita', error);
      setState((current) => ({ ...current, status: 'installError', progress: null }));
    } finally {
      busyRef.current = false;
    }
  }, []);

  const restart = useCallback(async () => {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) return undefined;
    let cancelled = false;
    isStorePackage().then((store) => {
      if (!cancelled) setStoreManaged(store);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selfUpdating) return undefined;
    const timer = setTimeout(() => check({ silent: true }), STARTUP_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [selfUpdating, check]);

  return {
    ...state,
    supported: selfUpdating,
    hasUpdate: ['available', 'downloading', 'installing', 'ready', 'installError'].includes(state.status),
    check,
    install,
    restart,
  };
}
