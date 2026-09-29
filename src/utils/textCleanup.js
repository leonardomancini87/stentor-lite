import { isMarkerCue } from './markers.js';
import { transformSpansForTextEdit } from './inlineStyleSpans.js';

// Pulizia del testo delle battute (scheda "Pulizia" della card Strumenti).

export const CLEANUP_OPTIONS = [
  {
    id: 'spaces',
    label: 'Spazi',
    help: 'Toglie spazi doppi, spazi prima della punteggiatura e spazi a inizio o fine riga.',
    common: true,
  },
  {
    id: 'emptyLines',
    label: 'Righe vuote',
    help: 'Eliminare eventuali righe presenti vuote dentro le battute',
    common: true,
  },
  {
    id: 'typography',
    label: 'Tipografia',
    help: 'Apostrofo tipografico (’) e tre puntini in un solo carattere (…).',
    common: false,
  },
];

export const DEFAULT_CLEANUP = Object.fromEntries(CLEANUP_OPTIONS.map((option) => [option.id, option.common]));

export function isFrenchLanguage(lang) {
  const code = String(lang || '').toLowerCase();
  return code === 'fr' || code.startsWith('fr-');
}

// Pulisce un testo. In francese gli spazi davanti a ; : ! ? sono corretti:
// vengono resi spazi unificatori invece di essere tolti.
export function cleanText(value, options = DEFAULT_CLEANUP, lang = null) {
  let next = String(value ?? '');
  const french = isFrenchLanguage(lang);

  if (options.emptyLines) {
    next = next.split('\n').filter((line) => line.trim() !== '').join('\n');
  }

  if (options.spaces) {
    next = next
      .split('\n')
      .map((line) => line.replace(/[\t ]{2,}/g, ' ').trim())
      .join('\n');
    if (french) {
      next = next.replace(/[\t ]+([,.…])/g, '$1');
      next = next.replace(/[\t \u00A0\u202F]*([;:!?])/g, (match, mark, offset) => (offset === 0 ? mark : `\u00A0${mark}`));
    } else {
      next = next.replace(/[\t \u00A0]+([,.;:?!…])/g, '$1');
    }
  }

  if (options.typography) {
    next = next
      .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])'([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1\u2019$2')
      .replace(/\.{3}/g, '\u2026');
  }

  return next;
}

// Applica la pulizia a tutte le lingue delle battute scelte (onlyCueId = una sola battuta).
// Restituisce il nuovo elenco di battute e quante ne sono cambiate.
export function cleanCues(cues = [], options = DEFAULT_CLEANUP, { onlyCueId = null } = {}) {
  let changedCues = 0;
  const nextCues = cues.map((cue) => {
    if (isMarkerCue(cue)) return cue;
    if (onlyCueId !== null && cue.id !== onlyCueId) return cue;
    let changed = false;
    const nextCue = { ...cue };
    const original = cleanText(cue.original || '', options, null);
    if (original !== (cue.original || '')) { nextCue.original = original; changed = true; }
    const translations = { ...(cue.translations || {}) };
    const textSpans = { ...(cue.textSpans || {}) };
    Object.keys(translations).forEach((lang) => {
      const previous = translations[lang] || '';
      const next = cleanText(previous, options, lang);
      if (next === previous) return;
      translations[lang] = next;
      const spans = transformSpansForTextEdit(textSpans[lang] || [], previous, next);
      if (spans.length) textSpans[lang] = spans;
      else delete textSpans[lang];
      changed = true;
    });
    if (!changed) return cue;
    changedCues += 1;
    return { ...nextCue, translations, textSpans };
  });
  return { cues: nextCues, changedCues };
}
