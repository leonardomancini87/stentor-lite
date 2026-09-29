import { splitCue as splitCueAction } from './subtitleActions.js';

export function splitCueByLinesAction({
  project,
  cueId,
  language,
}) {
  const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);

  if (cueIndex === -1) {
    return {
      error: 'Sopratitolo non trovato.',
    };
  }

  const cue = project.cues[cueIndex];
  const text = cue.original;

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      error:
        'Questo sopratitolo ha una sola riga. Dividilo manualmente andando a capo.',
    };
  }

  return {
    project: splitCueAction(project, cueId, language),
    nextActiveIndex: cueIndex + 1,
  };
}