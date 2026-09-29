export const MARKER_TYPES = [
  { value: 'act', label: 'Atto' },
  { value: 'scene', label: 'Scena' },
  { value: 'picture', label: 'Quadro' },
  { value: 'interval', label: 'Intervallo' },
  { value: 'other', label: 'Altro' },
];

export function isMarkerCue(cue) {
  return cue?.type === 'marker';
}

export function getMarkerTypeLabel(type) {
  return MARKER_TYPES.find((item) => item.value === type)?.label || 'Marcatore';
}

export function getMarkerTitle(cue) {
  if (!cue) return '';
  const label = getMarkerTypeLabel(cue.markerType);
  return cue.title || cue.markerTitle || label;
}

export function getProjectMarkers(cues = []) {
  return cues
    .map((cue, index) => ({ cue, index }))
    .filter(({ cue }) => isMarkerCue(cue));
}

export function findNextPlayableIndex(cues = [], startIndex = 0) {
  if (!cues.length) return 0;

  for (let index = Math.max(0, startIndex); index < cues.length; index += 1) {
    if (!isMarkerCue(cues[index])) return index;
  }

  for (let index = Math.min(startIndex, cues.length - 1); index >= 0; index -= 1) {
    if (!isMarkerCue(cues[index])) return index;
  }

  return Math.max(0, Math.min(startIndex, cues.length - 1));
}

export function findPreviousPlayableIndex(cues = [], startIndex = 0) {
  if (!cues.length) return 0;

  for (let index = Math.min(startIndex, cues.length - 1); index >= 0; index -= 1) {
    if (!isMarkerCue(cues[index])) return index;
  }

  return findNextPlayableIndex(cues, startIndex);
}

export function findAdjacentPlayableIndex(cues = [], currentIndex = 0, delta = 1) {
  if (!cues.length) return 0;

  const direction = delta < 0 ? -1 : 1;
  let index = currentIndex + direction;

  while (index >= 0 && index < cues.length) {
    if (!isMarkerCue(cues[index])) return index;
    index += direction;
  }

  return findNextPlayableIndex(cues, currentIndex);
}

export function getMarkerJumpIndex(cues = [], markerIndex = 0) {
  return findNextPlayableIndex(cues, markerIndex + 1);
}
