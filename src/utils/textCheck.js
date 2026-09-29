import { isMarkerCue } from './markers.js';
import { getSubtitleStats } from './subtitleStats.js';
import { stripInlineFormatting } from './inlineFormatting.js';
import { isFrenchLanguage } from './textCleanup.js';

// Verifica del copione (scheda "Verifica" della card Strumenti): sempre aggiornata,
// senza tempi né velocità di lettura (Sténtor Lite è a conduzione manuale).

// Contrasto tra colore del testo e sfondo dello schermo (formula WCAG).
function luminance(hex = '#000000') {
  const raw = String(hex).replace('#', '').trim();
  const value = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
  const channel = (offset) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function getContrastRatio(foreground, background) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

export const MAX_LINES = 2;
export const MAX_CHARS_PER_LINE = 42; // valore di partenza
export const MAX_TOTAL_CHARS = 84;
export const LINE_LIMIT_PRESETS = [37, 42];
export const MIN_LINE_LIMIT = 20;
export const MAX_LINE_LIMIT = 80;

// Limite di caratteri per riga del progetto (impostabile in Strumenti > Verifica).
export function normalizeLineLimit(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return MAX_CHARS_PER_LINE;
  return Math.min(MAX_LINE_LIMIT, Math.max(MIN_LINE_LIMIT, number));
}

export function getLineLimit(project) {
  const value = project?.settings?.maxCharsPerLine;
  return value == null ? MAX_CHARS_PER_LINE : normalizeLineLimit(value);
}

export function getCheckDetail(type, limit = MAX_CHARS_PER_LINE) {
  if (type.id === 'long') return `Più di ${limit} caratteri in una riga o ${limit * MAX_LINES} in tutto.`;
  return type.detail;
}

export const CHECK_TYPES = [
  { id: 'missing', severity: 'error', title: 'Controllo testi mancanti', single: 'senza testo in questa lingua', detail: 'Battute senza testo nella lingua di lavoro.' },
  { id: 'lines', severity: 'error', title: 'Controllo righe', single: 'con più di due righe', detail: 'Battute con più di due righe.' },
  { id: 'long', severity: 'warning', title: 'Controllo lunghezza', single: 'troppo lunga', detail: '' },
  { id: 'spacing', severity: 'info', title: 'Controllo spazi', single: 'con spazi da sistemare', detail: 'Spazi doppi o fuori posto: la scheda Pulizia li corregge.' },
];

export function getCueProblems(cue, language, limit = MAX_CHARS_PER_LINE) {
  if (!cue || isMarkerCue(cue)) return [];
  const raw = String(cue.translations?.[language] || '');
  const text = stripInlineFormatting(raw);
  if (!text.trim()) return ['missing'];
  const problems = [];
  const lines = text.split('\n');
  if (lines.length > MAX_LINES) problems.push('lines');
  if (text.length > limit * MAX_LINES || lines.some((line) => line.trim().length > limit)) problems.push('long');
  // In francese lo spazio davanti a ; : ! ? è corretto e non viene segnalato.
  const spaceBeforePunctuation = isFrenchLanguage(language) ? /[^\S\n]+[,.…]/ : /[^\S\n]+[,.;:?!…]/;
  if (/[^\S\n]{2,}/.test(text) || spaceBeforePunctuation.test(text) || /^[^\S\n]+|[^\S\n]+$/m.test(text)) problems.push('spacing');
  return problems;
}

export function describeCue(cue, language) {
  const text = String(cue?.translations?.[language] || '');
  const stats = getSubtitleStats(text, null);
  return { lineCount: stats.lineCount, totalChars: stats.totalChars, charsPerLine: stats.lineCount ? stats.charsPerLine : [] };
}

export function buildTextCheck(cues = [], language = 'it', screenColors = {}, limit = MAX_CHARS_PER_LINE) {
  const groups = Object.fromEntries(CHECK_TYPES.map((type) => [type.id, []]));
  cues.forEach((cue, index) => {
    getCueProblems(cue, language, limit).forEach((problem) => groups[problem].push(index));
  });
  const contrastRatio = getContrastRatio(screenColors.text || '#F3E7B3', screenColors.background || '#000000');
  const contrast = contrastRatio < 4.5 ? 'error' : contrastRatio < 7 ? 'warning' : 'ok';
  const items = CHECK_TYPES
    .map((type) => ({ ...type, detail: getCheckDetail(type, limit), indexes: groups[type.id] }))
    .filter((item) => item.indexes.length);
  return {
    items,
    contrastRatio,
    contrast,
    total: cues.filter((cue) => !isMarkerCue(cue)).length,
    clean: items.every((item) => item.severity === 'info') && contrast !== 'error',
  };
}

// Prossima battuta del gruppo dopo quella selezionata (ricomincia dall'inizio).
export function nextIndexAfter(indexes = [], current = -1) {
  if (!indexes.length) return -1;
  return indexes.find((index) => index > current) ?? indexes[0];
}
