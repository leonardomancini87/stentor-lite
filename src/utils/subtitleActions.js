import { transformSpansForTextEdit } from './inlineStyleSpans.js';
import { getNextCueId } from '../lib/cueOperations.js';

export function updateCue(project, cueId, updater) {
  return {
    ...project,
    cues: project.cues.map((cue) =>
      cue.id === cueId ? updater(cue) : cue
    ),
  };
}

export function updateTranslation(project, cueId, lang, value) {
  return updateCue(project, cueId, (cue) => {
    const previousText = String(cue.translations?.[lang] ?? cue.original ?? '');
    const nextText = String(value ?? '');
    const previousSpans = cue.textSpans?.[lang] || [];
    const nextSpans = transformSpansForTextEdit(previousSpans, previousText, nextText);
    const textSpans = { ...(cue.textSpans || {}) };
    if (nextSpans.length) textSpans[lang] = nextSpans;
    else delete textSpans[lang];
    return {
      ...cue,
      translations: {
        ...cue.translations,
        [lang]: nextText,
      },
      textSpans,
    };
  });
}

export function addCue(project) {
  const nextId = getNextCueId(project.cues);

  const newCue = {
    id: nextId,
    speaker: '',
    original: 'Nuova battuta.',
    translations: Object.fromEntries(
      project.languages.map((lang) => [lang, 'Nuovo sopratitolo.'])
    ),
    note: '',
    renderStyle: 'normal',
  };

  return {
    ...project,
    cues: [...project.cues, newCue],
  };
}

export function deleteCue(project, cueId) {
  if (project.cues.length <= 1) {
    return project;
  }

  return {
    ...project,
    cues: project.cues.filter((cue) => cue.id !== cueId),
  };
}

export function splitCue(project, cueId, language) {
  const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);

  if (cueIndex === -1) {
    return project;
  }

  const cue = project.cues[cueIndex];

  const text = cue.translations?.[language] || cue.original;

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return project;
  }

  const midpoint = Math.ceil(lines.length / 2);

  const firstText = lines.slice(0, midpoint).join('\n');
  const secondText = lines.slice(midpoint).join('\n');

  const updatedCue = {
    ...cue,
    original: firstText,
    translations: {
      ...cue.translations,
      [language]: firstText,
    },
  };

  const newCue = {
    ...cue,
    id: getNextCueId(project.cues),
    original: secondText,
    translations: {
      ...cue.translations,
      [language]: secondText,
    },
  };

  const updatedCues = [...project.cues];

  updatedCues.splice(cueIndex, 1, updatedCue, newCue);

  return {
    ...project,
    cues: updatedCues,
  };
}

export function mergeWithPrevious(project, cueId, language) {
  const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);

  if (cueIndex <= 0) {
    return project;
  }

  const previous = project.cues[cueIndex - 1];
  const current = project.cues[cueIndex];

  const mergedText = [
    previous.translations?.[language] || previous.original,
    current.translations?.[language] || current.original,
  ].join('\n');

  const mergedCue = {
    ...previous,
    original: mergedText,
    translations: {
      ...previous.translations,
      [language]: mergedText,
    },
  };

  const updatedCues = [...project.cues];

  updatedCues.splice(cueIndex - 1, 2, mergedCue);

  return {
    ...project,
    cues: updatedCues,
  };
}