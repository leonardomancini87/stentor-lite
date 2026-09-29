import { getNextCueId } from '../lib/cueOperations.js';
import { isMarkerCue } from './markers.js';
import { getCueTextSpans, mergeTextAndSpans, splitTextAndSpans } from './inlineStyleSpans.js';

function normalizeEdgeWhitespace(value) {
  return String(value ?? '').trim();
}

function joinCueText(first, second, separator = ' ') {
  const left = normalizeEdgeWhitespace(first);
  const right = normalizeEdgeWhitespace(second);
  if (!left) return right;
  if (!right) return left;
  return `${left}${separator}${right}`;
}

function getCueLanguageText(cue, language) {
  if (cue?.translations && Object.prototype.hasOwnProperty.call(cue.translations, language)) {
    return String(cue.translations[language] ?? '');
  }
  return String(cue?.original ?? '');
}

function projectLanguages(project, ...cues) {
  const values = new Set(Array.isArray(project?.languages) ? project.languages : []);
  cues.forEach((cue) => {
    Object.keys(cue?.translations || {}).forEach((language) => values.add(language));
  });
  if (!values.size && project?.activeLanguage) values.add(project.activeLanguage);
  return [...values];
}

export function createCueAfter(project, cueId) {
  const cues = Array.isArray(project?.cues) ? project.cues : [];
  const cueIndex = cues.findIndex((cue) => cue.id === cueId);
  if (cueIndex === -1) return { error: 'Sopratitolo non trovato.', project };
  if (isMarkerCue(cues[cueIndex])) return { error: 'Non puoi aggiungere un sopratitolo da un marcatore.', project };

  const languages = projectLanguages(project);
  const newCue = {
    id: getNextCueId(cues),
    speaker: '',
    original: '',
    translations: Object.fromEntries(languages.map((language) => [language, ''])),
    textSpans: {},
    note: '',
    startTime: null,
    endTime: null,
    renderStyle: 'normal',
  };
  const nextCues = [...cues];
  const insertIndex = cueIndex + 1;
  nextCues.splice(insertIndex, 0, newCue);

  return {
    project: { ...project, cues: nextCues },
    insertIndex,
    newCueId: newCue.id,
  };
}

export function deleteCueStructural(project, cueId) {
  const cues = Array.isArray(project?.cues) ? project.cues : [];
  const cueIndex = cues.findIndex((cue) => cue.id === cueId);
  if (cueIndex === -1) return { error: 'Sopratitolo non trovato.', project };
  if (isMarkerCue(cues[cueIndex])) return { error: 'Questa azione non elimina i marcatori.', project };
  const playableCount = cues.filter((cue) => !isMarkerCue(cue)).length;
  if (playableCount <= 1) return { error: 'Deve rimanere almeno un sopratitolo.', project };

  const nextCues = cues.filter((cue) => cue.id !== cueId);
  return {
    project: { ...project, cues: nextCues },
    deletedIndex: cueIndex,
    nextIndex: Math.max(0, Math.min(cueIndex, nextCues.length - 1)),
  };
}

export function mergeCueWithNextStructural(project, cueId) {
  const cues = Array.isArray(project?.cues) ? project.cues : [];
  const cueIndex = cues.findIndex((cue) => cue.id === cueId);
  if (cueIndex === -1) return { error: 'Sopratitolo non trovato.', project };
  const first = cues[cueIndex];
  const second = cues[cueIndex + 1];
  if (!second) return { error: 'Non ci sono sopratitoli successivi da unire.', project };
  if (isMarkerCue(first) || isMarkerCue(second)) {
    return { error: 'Non puoi unire un sopratitolo con un marcatore.', project };
  }

  const languages = projectLanguages(project, first, second);
  const translations = {};
  const textSpans = {};
  languages.forEach((language) => {
    const merged = mergeTextAndSpans(
      getCueLanguageText(first, language),
      getCueTextSpans(first, language),
      getCueLanguageText(second, language),
      getCueTextSpans(second, language),
    );
    translations[language] = merged.text;
    if (merged.spans.length) textSpans[language] = merged.spans;
  });
  const firstVoice = normalizeEdgeWhitespace(first.speaker);
  const secondVoice = normalizeEdgeWhitespace(second.speaker);
  const speaker = firstVoice || secondVoice;
  const note = joinCueText(first.note, second.note, ' · ');
  const mergedCue = {
    ...first,
    speaker,
    original: joinCueText(first.original, second.original),
    translations,
    textSpans,
    note,
    // Timing and style of the first cue deliberately survive.
  };
  const nextCues = [...cues];
  nextCues.splice(cueIndex, 2, mergedCue);

  return {
    project: { ...project, cues: nextCues },
    mergedIndex: cueIndex,
    mergedCueId: mergedCue.id,
    discardedCueId: second.id,
  };
}

export function splitCueAtCursorStructural({
  project,
  cueId,
  language,
  cursor,
  fullText,
  otherLanguagesTarget = 'first',
}) {
  const cues = Array.isArray(project?.cues) ? project.cues : [];
  const cueIndex = cues.findIndex((cue) => cue.id === cueId);
  if (cueIndex === -1) return { error: 'Sopratitolo non trovato.', project };
  const cue = cues[cueIndex];
  if (isMarkerCue(cue)) return { error: 'Non puoi dividere un marcatore.', project };
  if (!['first', 'second'].includes(otherLanguagesTarget)) {
    return { error: 'Scelta non valida per le altre lingue.', project };
  }

  const source = String(fullText ?? '');
  const safeCursor = Number.isInteger(cursor) ? Math.max(0, Math.min(cursor, source.length)) : null;
  if (safeCursor === null) {
    return { error: 'Metti il cursore nel punto in cui vuoi dividere il sopratitolo.', project };
  }

  const split = splitTextAndSpans(source, getCueTextSpans(cue, language), safeCursor);
  const before = split.firstText;
  const after = split.secondText;
  const languages = projectLanguages(project, cue);
  const firstTranslations = { ...(cue.translations || {}) };
  const secondTranslations = { ...(cue.translations || {}) };
  const firstTextSpans = {};
  const secondTextSpans = {};

  languages.forEach((lang) => {
    if (lang === language) {
      firstTranslations[lang] = before;
      secondTranslations[lang] = after;
      if (split.firstSpans.length) firstTextSpans[lang] = split.firstSpans;
      if (split.secondSpans.length) secondTextSpans[lang] = split.secondSpans;
      return;
    }
    const value = getCueLanguageText(cue, lang);
    const spans = getCueTextSpans(cue, lang);
    firstTranslations[lang] = otherLanguagesTarget === 'first' ? value : '';
    secondTranslations[lang] = otherLanguagesTarget === 'second' ? value : '';
    if (otherLanguagesTarget === 'first' && spans.length) firstTextSpans[lang] = spans;
    if (otherLanguagesTarget === 'second' && spans.length) secondTextSpans[lang] = spans;
  });

  const originalMatchesEditedText = String(cue.original ?? '') === source;
  const firstOriginal = originalMatchesEditedText
    ? before
    : (otherLanguagesTarget === 'first' ? String(cue.original ?? '') : '');
  const secondOriginal = originalMatchesEditedText
    ? after
    : (otherLanguagesTarget === 'second' ? String(cue.original ?? '') : '');

  const firstCue = {
    ...cue,
    original: firstOriginal,
    translations: firstTranslations,
    textSpans: firstTextSpans,
  };
  const secondCue = {
    ...cue,
    id: getNextCueId(cues),
    original: secondOriginal,
    translations: secondTranslations,
    textSpans: secondTextSpans,
    note: '',
    startTime: null,
    endTime: null,
  };
  const nextCues = [...cues];
  nextCues.splice(cueIndex, 1, firstCue, secondCue);

  return {
    project: { ...project, cues: nextCues },
    firstIndex: cueIndex,
    secondIndex: cueIndex + 1,
    firstCueId: firstCue.id,
    secondCueId: secondCue.id,
  };
}

export function hasOtherLanguageText(project, cueId, activeLanguage) {
  const cue = project?.cues?.find((item) => item.id === cueId);
  if (!cue || isMarkerCue(cue)) return false;
  return projectLanguages(project, cue).some((language) => (
    language !== activeLanguage && normalizeEdgeWhitespace(getCueLanguageText(cue, language))
  ));
}
