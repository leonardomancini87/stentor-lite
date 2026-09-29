// Comandi inviati dalla finestra dello schermo di proiezione (public/public-stage.html)
// alla finestra principale: chi proietta può usare la tastiera anche nella finestra dello schermo.
// Il comando arriva sia con postMessage sia con localStorage, con lo stesso id:
// la finestra principale lo esegue una volta sola.

export const STAGE_COMMAND_TYPE = 'STENTORE_CONTROL';
export const STAGE_COMMAND_STORAGE_KEY = 'stentore-control-command-v1';

const COMMANDS = {
  avanti: 'next',
  next: 'next',
  indietro: 'previous',
  previous: 'previous',
  alterna_buio: 'toggleBlackout',
  toggle_blackout: 'toggleBlackout',
};

function parse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

// Restituisce { id, action } con action = 'next' | 'previous' | 'toggleBlackout', oppure null.
export function normalizeStageCommand(raw) {
  const value = parse(raw);
  if (!value) return null;
  const action = COMMANDS[String(value.comando || value.command || '').trim().toLowerCase()];
  if (!action) return null;
  return { id: value.id ? String(value.id) : null, action };
}
