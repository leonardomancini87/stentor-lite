import { mergeWithPrevious as mergeWithPreviousAction } from './subtitleActions.js';

export function mergeCueWithPreviousAction({
  project,
  cueId,
  language,
}) {
  const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);

  if (cueIndex <= 0) {
    return {
      error: 'Non ci sono sopratitoli precedenti da unire.',
    };
  }

  return {
    project: mergeWithPreviousAction(project, cueId, language),
    nextActiveIndex: cueIndex - 1,
  };
}   