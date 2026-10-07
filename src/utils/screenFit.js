import { isMarkerCue } from './markers.js';
import { getCueTextStyle } from './cueTextStyle.js';
import { getProjectionText, getSecondProjectionText } from './projectionTargets.js';
import { getScreenLanguage, getScreenSecondLanguage, getScreens, screenToPublicSettings } from './screenSettings.js';
import { clampSecondScale } from './stageLayout.js';

// Battute che non entrano in uno schermo: lo schermo non va a capo da solo né rimpicciolisce il
// testo, quindi una riga più larga della «Larghezza» impostata in Schermi viene tagliata ai lati.
// Si misura ogni riga con carattere e dimensione di ogni schermo (seconda lingua compresa).
// La misura è quella della battuta intera: grassetti o dimensioni cambiate su singole parole
// non sono considerati.

export const STAGE_WIDTH = 2360; // larghezza della tela di proiezione (vedi StageSubtitle)
const LETTER_SPACING_EM = 0.005;
const TOLERANCE = 1.005;

function number(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// `measure(text, { fontFamily, fontPx, bold, italic })` restituisce la larghezza del testo in
// unità della tela, senza spaziatura tra le lettere (la aggiunge questa funzione).
export function findCuesWiderThanScreens(project, activeLanguage, measure) {
  const cues = project?.cues || [];
  const languages = project?.languages || [];
  const primaryLanguage = project?.primaryLanguage || languages[0];
  const screens = getScreens(project?.settings).map((screen) => {
    const settings = screenToPublicSettings(screen);
    const fontPx = number(settings.publicFontSize, 58);
    return {
      language: getScreenLanguage(screen, activeLanguage, languages),
      secondLanguage: getScreenSecondLanguage(screen, activeLanguage, languages),
      fontFamily: settings.publicFontFamily,
      fontPx,
      secondFontPx: fontPx * (clampSecondScale(settings.publicSecondScale) / 100),
      clipWidth: STAGE_WIDTH * (Math.min(100, number(settings.publicMaxWidth, 90)) / 100),
    };
  });

  const tooWide = (text, screen, fontPx, style) => String(text || '').split(/\r?\n/).some((line) => {
    if (!line.trim()) return false;
    const width = measure(line, { fontFamily: screen.fontFamily, fontPx, ...style }) + line.length * LETTER_SPACING_EM * fontPx;
    return width > screen.clipWidth * TOLERANCE;
  });

  const result = [];
  cues.forEach((cue, index) => {
    if (!cue || isMarkerCue(cue)) return;
    const style = { bold: getCueTextStyle(cue).bold, italic: cue.renderStyle === 'italic' };
    const wide = screens.some((screen) => {
      const text = getProjectionText(cue, screen.language);
      if (tooWide(text, screen, screen.fontPx, style)) return true;
      if (!screen.secondLanguage || !text.trim()) return false;
      return tooWide(getSecondProjectionText(cue, screen.secondLanguage, primaryLanguage), screen, screen.secondFontPx, style);
    });
    if (wide) result.push(index);
  });
  return result;
}

// Misura nel browser, con lo stesso carattere usato in proiezione. Senza canvas (test, ambienti
// senza pagina) restituisce null: il controllo semplicemente non compare.
export function createCanvasTextMeasure() {
  if (typeof document === 'undefined') return null;
  const context = document.createElement('canvas').getContext?.('2d');
  if (!context) return null;
  return (text, { fontFamily, fontPx, bold, italic }) => {
    context.font = `${italic ? 'italic ' : ''}${bold ? 800 : 400} ${fontPx}px ${fontFamily}`;
    return context.measureText(text).width;
  };
}

// Il canvas non carica da solo i caratteri web: finché non sono pronti misurerebbe con un
// carattere di riserva, più stretto o più largo. Si chiedono qui tutte le varianti usate
// dagli schermi del progetto; la promessa si risolve quando sono disponibili.
export function loadScreenFonts(project) {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  const families = [...new Set(getScreens(project?.settings).map((screen) => screenToPublicSettings(screen).publicFontFamily))];
  const variants = ['400', '800', 'italic 400', 'italic 800'];
  return Promise.all(families.flatMap((family) => variants.map((variant) => document.fonts.load(`${variant} 32px ${family}`).catch(() => null))));
}
