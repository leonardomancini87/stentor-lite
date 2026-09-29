import { computeCPS, getCPSSeverity } from './readingSpeed.js';
import { stripInlineFormatting } from './inlineFormatting.js';
import { getCueDuration } from './timecode.js';

export function getSubtitleStats(text = '', cue = null) {
  const plainText = stripInlineFormatting(text);
  const lines = plainText.split('\n');
  const duration = cue ? getCueDuration(cue) : null;
  const cps = computeCPS(plainText, duration);

  return {
    totalChars: plainText.length,
    lineCount: text.trim() ? lines.length : 0,
    charsPerLine: lines.map((line) => line.length),
    duration,
    cps,
    cpsSeverity: getCPSSeverity(cps),
  };
}