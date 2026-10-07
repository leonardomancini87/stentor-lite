import { isMarkerCue } from './markers.js';
import { transformSpansForTextEdit } from './inlineStyleSpans.js';

// Cerca e sostituisci nel copione (scheda «Trova» della card Strumenti): lavora sul testo delle
// battute nella lingua di lavoro. Note operatore, voci e segnalibri non vengono toccati.

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matcher(query, caseSensitive) {
  return query ? new RegExp(escapeRegExp(query), caseSensitive ? 'gu' : 'giu') : null;
}

// Il testo di una battuta in una lingua sta in translations[lingua]. Solo per la lingua principale,
// se manca, vale il testo originale: nelle altre lingue una battuta non tradotta non ha testo proprio.
function readText(cue, language, primaryLanguage) {
  const translated = cue?.translations?.[language];
  if (typeof translated === 'string') return { field: 'translation', text: translated };
  return { field: 'original', text: language === primaryLanguage ? String(cue?.original || '') : '' };
}

// { total, indexes }: quante occorrenze e in quali battute (posizioni nell'elenco).
export function findInCues(cues = [], language, query, { caseSensitive = false, primaryLanguage = null } = {}) {
  const pattern = matcher(query, caseSensitive);
  const indexes = [];
  let total = 0;
  if (!pattern) return { total, indexes };
  cues.forEach((cue, index) => {
    if (!cue || isMarkerCue(cue)) return;
    const count = (readText(cue, language, primaryLanguage).text.match(pattern) || []).length;
    if (!count) return;
    total += count;
    indexes.push(index);
  });
  return { total, indexes };
}

// Sostituisce tutte le occorrenze. Le formattazioni (grassetto, colore…) seguono il testo.
export function replaceInCues(cues = [], language, query, replacement = '', { caseSensitive = false, primaryLanguage = null } = {}) {
  const pattern = matcher(query, caseSensitive);
  let replaced = 0;
  let changedCues = 0;
  if (!pattern) return { cues, replaced, changedCues };
  const nextCues = cues.map((cue) => {
    if (!cue || isMarkerCue(cue)) return cue;
    const { field, text } = readText(cue, language, primaryLanguage);
    const count = (text.match(pattern) || []).length;
    if (!count) return cue;
    // Il testo sostitutivo va inserito alla lettera: «$» non ha significati speciali.
    const next = text.replace(pattern, () => String(replacement));
    if (next === text) return cue;
    replaced += count;
    changedCues += 1;
    if (field === 'original') return { ...cue, original: next };
    const textSpans = { ...(cue.textSpans || {}) };
    const spans = transformSpansForTextEdit(textSpans[language] || [], text, next);
    if (spans.length) textSpans[language] = spans;
    else delete textSpans[language];
    return { ...cue, translations: { ...cue.translations, [language]: next }, textSpans };
  });
  return { cues: nextCues, replaced, changedCues };
}
