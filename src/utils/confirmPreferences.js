// Avvisi di conferma che si possono disattivare («Non mostrare questo avviso in futuro»).
// La scelta vale per questo computer e si cambia in Impostazioni.
const SKIP_CUE_DELETE_KEY = 'stentor.skipCueDeleteConfirm.v1';

export function shouldConfirmCueDelete() {
  try {
    return window.localStorage.getItem(SKIP_CUE_DELETE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setConfirmCueDelete(confirm) {
  try {
    if (confirm) window.localStorage.removeItem(SKIP_CUE_DELETE_KEY);
    else window.localStorage.setItem(SKIP_CUE_DELETE_KEY, '1');
  } catch {
    // Memoria locale non disponibile: l'avviso resta attivo.
  }
}
