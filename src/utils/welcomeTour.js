// Guida di benvenuto: sette passaggi mostrati al primo avvio di Sténtor Lite
// e riaperti quando si vuole da Impostazioni → Guida introduttiva.
// Ogni passaggio porta dietro la guida la pagina di cui parla (`page` = viewMode dell'app).

export const WELCOME_TOUR_STORAGE_KEY = 'stentor.welcomeTour.v1';

export const WELCOME_TOUR_STEPS = [
  { id: 'welcome', page: 'editor' },
  { id: 'projects', page: 'dashboard' },
  { id: 'cues', page: 'editor' },
  { id: 'screens', page: 'screens' },
  { id: 'projection', page: 'editor' },
  { id: 'live', page: 'editor' },
  { id: 'ready', page: 'preferences' },
];

// Chiavi che esistono solo se l'app è già stata usata: chi aggiorna da una versione
// precedente non vede la guida da solo (la trova comunque in Impostazioni).
const EXISTING_USER_KEYS = [
  'stentore.projectArchive.v1',
  'stentore.currentProjectId.v1',
  'opensurtitles.currentProject',
];

function safeGet(storage, key) {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

// Da chiamare all'avvio, prima che l'app salvi qualcosa nella memoria locale.
export function shouldShowWelcomeTour(storage = globalThis.localStorage) {
  if (!storage) return false;
  if (safeGet(storage, WELCOME_TOUR_STORAGE_KEY)) return false;
  return !EXISTING_USER_KEYS.some((key) => safeGet(storage, key) !== null);
}

export function markWelcomeTourSeen(storage = globalThis.localStorage) {
  try { storage?.setItem(WELCOME_TOUR_STORAGE_KEY, 'seen'); } catch { /* memoria locale non disponibile */ }
}

export function clampTourStep(index) {
  const last = WELCOME_TOUR_STEPS.length - 1;
  if (!Number.isFinite(index)) return 0;
  return Math.min(last, Math.max(0, Math.trunc(index)));
}
