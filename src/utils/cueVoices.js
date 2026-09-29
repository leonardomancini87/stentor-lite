import { isMarkerCue } from './markers.js';

// A voice is optional cue metadata, never an entity or a persistent registry.
// Identity is case-sensitive and ignores ONLY surrounding whitespace.
export function normalizeVoice(value) {
  return String(value ?? '').trim();
}

export function getVoiceCounts(cues = [], locale = 'it') {
  const counts = new Map();
  for (const cue of cues) {
    if (!cue || isMarkerCue(cue)) continue;
    const voice = normalizeVoice(cue.speaker);
    if (voice) counts.set(voice, (counts.get(voice) || 0) + 1);
  }
  return [...counts].map(([voice, count]) => ({ voice, count }))
    .sort((a, b) => a.voice.localeCompare(b.voice, locale));
}

export function getUniqueVoices(cues = [], locale = 'it') {
  return getVoiceCounts(cues, locale).map(({ voice }) => voice);
}

function replaceMatchingVoices(project, matches, nextVoice) {
  const value = normalizeVoice(nextVoice);
  let changed = false;
  const cues = project.cues.map((cue) => {
    if (isMarkerCue(cue) || !matches(cue) || normalizeVoice(cue.speaker) === value) return cue;
    changed = true;
    return { ...cue, speaker: value };
  });
  return changed ? { ...project, cues } : project;
}

export function renameCueVoice(project, cueId, nextVoice) {
  return replaceMatchingVoices(project, (cue) => cue.id === cueId, nextVoice);
}

export function renameVoice(project, oldVoice, nextVoice) {
  const previous = normalizeVoice(oldVoice);
  // An empty field is not a shared voice. Never assign every unlabelled cue.
  if (!previous || previous === normalizeVoice(nextVoice)) return project;
  return replaceMatchingVoices(project, (cue) => normalizeVoice(cue.speaker) === previous, nextVoice);
}

export function planVoiceChange(project, cueId, nextVoice) {
  const cue = project.cues.find((item) => item.id === cueId && !isMarkerCue(item));
  if (!cue) return null;
  const previousVoice = normalizeVoice(cue.speaker);
  const value = normalizeVoice(nextVoice);
  if (previousVoice === value) return null;
  const matchingIds = previousVoice
    ? project.cues.filter((item) => !isMarkerCue(item) && normalizeVoice(item.speaker) === previousVoice).map((item) => item.id)
    : [cueId];
  return { projectId: project.id, cueId, previousVoice, nextVoice: value, matchingIds,
    count: matchingIds.length, needsChoice: Boolean(previousVoice) && matchingIds.length > 1 };
}

export function applyVoiceChange(project, change, scope = 'single') {
  if (!change || !['single', 'all'].includes(scope) || project.id !== change.projectId) return project;
  const cue = project.cues.find((item) => item.id === change.cueId && !isMarkerCue(item));
  // Do not apply a stale dialog to another project or a cue changed by undo/import.
  if (!cue || normalizeVoice(cue.speaker) !== change.previousVoice) return project;
  if (scope === 'all' && change.previousVoice) {
    const currentIds = project.cues.filter((item) => !isMarkerCue(item) && normalizeVoice(item.speaker) === change.previousVoice).map((item) => item.id);
    const confirmedIds = new Set(change.matchingIds);
    if (currentIds.length !== confirmedIds.size || currentIds.some((id) => !confirmedIds.has(id))) return project;
    return renameVoice(project, change.previousVoice, change.nextVoice);
  }
  return renameCueVoice(project, change.cueId, change.nextVoice);
}
