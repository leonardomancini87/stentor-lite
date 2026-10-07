// Scorciatoie da tastiera personalizzabili di Sténtor Lite.
// Ogni azione ha fino a tre tasti. Un tasto è { code, shift } (event.code, indipendente
// dal layout). Cmd/Ctrl/Alt restano al sistema e al browser; Esc e Tab non si assegnano.

export const SHORTCUTS_STORAGE_KEY = 'stentor.shortcuts.v1';
export const MAX_BINDINGS = 3;

// Pag ↓ e Pag ↑ sono i tasti dei telecomandi da presentazione.
export const SHORTCUT_ACTIONS = [
  { id: 'next', label: 'Avanti', detail: 'Proietta la battuta successiva', defaults: [{ code: 'Space' }, { code: 'ArrowRight' }, { code: 'PageDown' }] },
  { id: 'previous', label: 'Indietro', detail: 'Torna alla battuta precedente', defaults: [{ code: 'Space', shift: true }, { code: 'ArrowLeft' }, { code: 'PageUp' }] },
  { id: 'blackout', label: 'Schermo vuoto', detail: 'Oscura o riaccende lo schermo', defaults: [{ code: 'KeyB' }] },
  { id: 'fullscreen', label: 'Schermo intero', detail: "Apre l'anteprima a tutto schermo", defaults: [{ code: 'KeyF' }] },
  { id: 'browseNext', label: 'Seleziona successiva', detail: 'Scorre l’elenco senza proiettare', defaults: [{ code: 'ArrowDown' }], editorOnly: true },
  { id: 'browsePrevious', label: 'Seleziona precedente', detail: 'Scorre l’elenco senza proiettare', defaults: [{ code: 'ArrowUp' }], editorOnly: true },
];

// Scorciatoie fisse, mostrate solo per riferimento.
export const FIXED_SHORTCUTS = [
  { id: 'undo', label: 'Annulla', keys: '⌘ Z' },
  { id: 'redo', label: 'Ripeti', keys: '⇧ ⌘ Z' },
  { id: 'exitField', label: 'Esci dal campo di testo', keys: 'Esc' },
];

const RESERVED_CODES = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Fn', 'ContextMenu']);

const CODE_LABELS = {
  Space: 'Spazio', Enter: 'Invio', NumpadEnter: 'Invio (tast. num.)', Backspace: '⌫', Delete: 'Canc',
  ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓',
  PageUp: 'Pag ↑', PageDown: 'Pag ↓', Home: 'Inizio', End: 'Fine',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', Backquote: '`', IntlBackslash: '<',
};

// `t` (facoltativo) traduce i nomi dei tasti: t('shortcuts.key.Space') ecc.
const TRANSLATED_KEYS = new Set(['Space', 'Enter', 'Delete', 'PageUp', 'PageDown', 'Home', 'End']);

export function formatCode(code, t) {
  if (!code) return '';
  if (t && TRANSLATED_KEYS.has(code)) return t(`shortcuts.key.${code}`);
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return t ? t('shortcuts.key.numpad', { key: code.slice(6) }) : `${code.slice(6)} (tast. num.)`;
  if (/^F\d{1,2}$/.test(code)) return code;
  return code;
}

export function formatBinding(binding, t) {
  if (!binding?.code) return '';
  return `${binding.shift ? '⇧ ' : ''}${formatCode(binding.code, t)}`;
}

function sameBinding(a, b) {
  return Boolean(a && b && a.code === b.code && Boolean(a.shift) === Boolean(b.shift));
}

function cleanBinding(value) {
  if (!value || typeof value !== 'object' || typeof value.code !== 'string' || !value.code) return null;
  if (RESERVED_CODES.has(value.code)) return null;
  return value.shift ? { code: value.code, shift: true } : { code: value.code };
}

export function getDefaultShortcuts() {
  return Object.fromEntries(SHORTCUT_ACTIONS.map((action) => [action.id, action.defaults.map((item) => ({ ...item }))]));
}

// Accetta dati salvati anche parziali o rovinati; un tasto non può stare su due azioni.
export function normalizeShortcuts(value) {
  const defaults = getDefaultShortcuts();
  if (!value || typeof value !== 'object') return defaults;
  const used = [];
  const result = {};
  for (const action of SHORTCUT_ACTIONS) {
    const source = Array.isArray(value[action.id]) ? value[action.id] : defaults[action.id];
    const list = [];
    for (const item of source) {
      const binding = cleanBinding(item);
      if (!binding || used.some((other) => sameBinding(other, binding))) continue;
      if (list.length >= MAX_BINDINGS) break;
      list.push(binding);
      used.push(binding);
    }
    result[action.id] = list;
  }
  return result;
}

export function loadShortcuts(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SHORTCUTS_STORAGE_KEY);
    return raw ? normalizeShortcuts(JSON.parse(raw)) : getDefaultShortcuts();
  } catch {
    return getDefaultShortcuts();
  }
}

export function saveShortcuts(shortcuts, storage = globalThis.localStorage) {
  try { storage?.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts)); } catch { /* storage non disponibile */ }
}

export function isCustomized(shortcuts) {
  return JSON.stringify(normalizeShortcuts(shortcuts)) !== JSON.stringify(getDefaultShortcuts());
}

// Tasto premuto durante la registrazione. Restituisce null per i tasti non assegnabili.
export function bindingFromEvent(event) {
  if (!event || event.metaKey || event.ctrlKey || event.altKey) return null;
  return cleanBinding({ code: event.code, shift: event.shiftKey });
}

export function findActionForBinding(shortcuts, binding, exceptActionId = null) {
  if (!binding) return null;
  for (const action of SHORTCUT_ACTIONS) {
    if (action.id === exceptActionId) continue;
    if ((shortcuts[action.id] || []).some((item) => sameBinding(item, binding))) return action;
  }
  return null;
}

// Assegna un tasto a un posto (da 0 a MAX_BINDINGS - 1) di un'azione. Se il tasto era usato altrove,
// viene tolto dall'altra azione. Restituisce { shortcuts, movedFrom }.
export function assignBinding(shortcuts, actionId, slot, binding) {
  const clean = cleanBinding(binding);
  const current = normalizeShortcuts(shortcuts);
  if (!clean || !current[actionId]) return { shortcuts: current, movedFrom: null };
  const movedFrom = findActionForBinding(current, clean, actionId);
  const next = {};
  for (const action of SHORTCUT_ACTIONS) {
    next[action.id] = current[action.id].filter((item) => !sameBinding(item, clean));
  }
  const list = [...next[actionId]];
  const index = Math.max(0, Math.min(slot, list.length, MAX_BINDINGS - 1));
  list[index] = clean;
  next[actionId] = list.slice(0, MAX_BINDINGS);
  return { shortcuts: next, movedFrom };
}

export function removeBinding(shortcuts, actionId, slot) {
  const current = normalizeShortcuts(shortcuts);
  if (!current[actionId]) return current;
  return { ...current, [actionId]: current[actionId].filter((_, index) => index !== slot) };
}

// Azione corrispondente a un tasto premuto (null se nessuna).
export function matchShortcut(event, shortcuts, { inEditor = true } = {}) {
  if (!event || event.metaKey || event.ctrlKey || event.altKey) return null;
  const pressed = { code: event.code, shift: event.shiftKey };
  for (const action of SHORTCUT_ACTIONS) {
    if (action.editorOnly && !inEditor) continue;
    if ((shortcuts?.[action.id] || []).some((item) => sameBinding(item, pressed))) return action.id;
  }
  return null;
}
