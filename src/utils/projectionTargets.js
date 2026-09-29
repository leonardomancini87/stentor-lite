import { FONT_FAMILY_OPTIONS, getScreenLanguage, screenToPublicSettings } from './screenSettings.js';
import { isMarkerCue } from './markers.js';
import { getCueText, getCueTextStyle } from './cueTextStyle.js';
import { getCueTextSpans } from './inlineStyleSpans.js';

export function getProjectionText(cue, language) {
  if (!cue || isMarkerCue(cue)) return '';
  return getCueText(cue, language);
}

export function buildProjectionPayload({
  cue,
  screen,
  activeLanguage = 'it',
  languages = [],
  blackout = false,
}) {
  const targetLanguage = getScreenLanguage(screen, activeLanguage, languages);
  const settings = screenToPublicSettings(screen);
  const text = getProjectionText(cue, targetLanguage);

  return {
    screenId: screen.id,
    screenName: screen.name,
    language: targetLanguage,
    text: blackout ? '' : text,
    textSpans: blackout ? [] : getCueTextSpans(cue, targetLanguage),
    blackout,
    cueStyle: cue?.renderStyle || 'normal',
    cueTextStyle: getCueTextStyle(cue),
    updatedAt: Date.now(),
    settings: {
      background: settings.publicBackground || '#000000',
      color: settings.publicTextColor || '#F3E7B3',
      fontSize: settings.publicFontSize || '58px',
      fontFamily: settings.publicFontFamily || FONT_FAMILY_OPTIONS[0].value,
      maxWidth: settings.publicMaxWidth || '90%',
      verticalAlign: settings.publicVerticalAlign || 'center',
      paddingTop: settings.publicPaddingTop || '0vh',
      fadeInMs: settings.publicFadeInMs ?? 120,
      fadeOutMs: settings.publicFadeOutMs ?? 120,
      blackoutFadeMs: settings.publicBlackoutFadeMs ?? 160,
      aspectRatio: settings.publicAspectRatio || '16:9',
    },
  };
}

export function getProjectionStorageKey(screenId) {
  return screenId
    ? `stentore-public-stage-payload-${screenId}`
    : 'stentore-public-stage-payload';
}
