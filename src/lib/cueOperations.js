export function getNextCueId(cues) {
  const numericIds = (Array.isArray(cues) ? cues : [])
    .map((cue) => Number(cue?.id))
    .filter((value) => Number.isFinite(value));
  return Math.max(0, ...numericIds) + 1;
}

export function findCueIndex(cues, cueId) {
  return cues.findIndex((cue) => cue.id === cueId);
}
