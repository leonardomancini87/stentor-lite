// Optional per-cue overrides. Global screen geometry/font/colour stay untouched.
// Missing overrides inherit the old rendering; old projects require no migration.
export function getCueText(cue, language) {
  return String(cue?.translations?.[language] ?? cue?.original ?? '');
}

// In Sténtor Lite i sopratitoli sono sempre centrati: un allineamento diverso salvato
// nella battuta (per esempio da Sténtor Pro) resta nel progetto ma non viene usato.
export const LITE_TEXT_ALIGN = 'center';

export function getCueTextStyle(cue) {
  const source = cue?.textStyle || {};
  return {
    bold: source.bold !== false,
    align: LITE_TEXT_ALIGN,
  };
}

export function getCueTypography(cue, defaultWeight = 800) {
  const { bold, align } = getCueTextStyle(cue);
  return {
    fontWeight: typeof cue?.textStyle?.bold === 'boolean' ? (bold ? 800 : 400) : defaultWeight,
    fontStyle: cue?.renderStyle === 'italic' ? 'italic' : 'normal',
    textAlign: align,
  };
}

export function patchCueTextStyle(cue, patch) {
  const next = { ...cue.textStyle };
  if (typeof patch.bold === 'boolean') next.bold = patch.bold;
  if (['left', 'center', 'right'].includes(patch.align)) next.align = patch.align;
  return { ...cue, textStyle: next };
}
