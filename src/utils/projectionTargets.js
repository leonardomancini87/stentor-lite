import { FONT_FAMILY_OPTIONS, getScreenLanguage, getScreenSecondLanguage, getScreenTransitionMs, screenToPublicSettings } from './screenSettings.js';
import { isMarkerCue } from './markers.js';
import { getCueText, getCueTextStyle } from './cueTextStyle.js';
import { getCueTextSpans } from './inlineStyleSpans.js';

export function getProjectionText(cue, language) {
  if (!cue || isMarkerCue(cue)) return '';
  return getCueText(cue, language);
}

// Testo della seconda lingua: solo una traduzione vera. Se la battuta non è tradotta in quella
// lingua resta vuoto (non si ripete il testo originale) e lo schermo mostra la prima lingua sola.
export function getSecondProjectionText(cue, language, primaryLanguage) {
  if (!cue || !language || isMarkerCue(cue)) return '';
  const text = language === primaryLanguage ? getCueText(cue, language) : String(cue?.translations?.[language] ?? '');
  return text.trim() ? text : '';
}

// Schermata di prova: nome dello schermo e una riga campione, con carattere, dimensione e
// posizione dello schermo. Serve ad allineare e mettere a fuoco il proiettore prima dello spettacolo.
export const TEST_PATTERN_SAMPLE = 'AaBbCc ÀÉÎÕÜ 0123456789';

export function getTestPatternText(screen) {
  return `${screen?.name || ''}\n${TEST_PATTERN_SAMPLE}`.trim();
}

export function buildProjectionPayload({
  cue,
  screen,
  activeLanguage = 'it',
  languages = [],
  primaryLanguage = languages[0],
  blackout = false,
  testPattern = false,
}) {
  const targetLanguage = getScreenLanguage(screen, activeLanguage, languages);
  const secondLanguage = getScreenSecondLanguage(screen, activeLanguage, languages);
  const settings = screenToPublicSettings(screen);
  const text = getProjectionText(cue, targetLanguage);
  const secondText = text.trim() ? getSecondProjectionText(cue, secondLanguage, primaryLanguage) : '';

  if (testPattern) {
    // La prova sostituisce battuta e buio finché resta accesa.
    const base = buildProjectionPayload({ cue: null, screen, activeLanguage, languages, primaryLanguage });
    return { ...base, text: getTestPatternText(screen), testPattern: true };
  }

  return {
    screenId: screen.id,
    screenName: screen.name,
    language: targetLanguage,
    text: blackout ? '' : text,
    textSpans: blackout ? [] : getCueTextSpans(cue, targetLanguage),
    secondLanguage,
    secondText: blackout ? '' : secondText,
    secondTextSpans: blackout || !secondText ? [] : getCueTextSpans(cue, secondLanguage),
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
      offsetX: settings.publicOffsetX || 0,
      offsetY: settings.publicOffsetY || 0,
      fadeInMs: settings.publicFadeInMs ?? 120,
      fadeOutMs: settings.publicFadeOutMs ?? 120,
      blackoutFadeMs: settings.publicBlackoutFadeMs ?? 160,
      transition: settings.publicTransition,
      transitionMs: getScreenTransitionMs(settings),
      aspectRatio: settings.publicAspectRatio || '16:9',
      secondScale: settings.publicSecondScale,
    },
  };
}

export function getProjectionStorageKey(screenId) {
  return screenId
    ? `stentore-public-stage-payload-${screenId}`
    : 'stentore-public-stage-payload';
}

// Segnale di presenza della finestra di proiezione: la finestra lo riscrive ogni secondo
// (public/public-stage.html), così la regia sa che uno schermo è aperto anche dopo essere stata
// ricaricata, o se la finestra è stata aperta da sé con il suo indirizzo.
export const STAGE_ALIVE_MAX_AGE_MS = 5000;

export function getStageAliveKey(screenId) {
  return `stentore-public-stage-alive-${screenId || 'default'}`;
}

export function isStageAlive(screenId, storage = globalThis.localStorage, now = Date.now()) {
  try {
    const beat = Number(storage?.getItem(getStageAliveKey(screenId)));
    return Number.isFinite(beat) && beat > 0 && now - beat < STAGE_ALIVE_MAX_AGE_MS;
  } catch {
    return false;
  }
}
