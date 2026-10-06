// Impaginazione verticale del sopratitolo sullo schermo: la prima lingua e, se c'è, la seconda
// sotto, più piccola, separata da un breve trattino centrale. Usata dall'anteprima (StageSubtitle);
// public/public-stage.html, che non importa moduli, ripete lo stesso calcolo: tenerli allineati.

export const LINE_HEIGHT = 1.12;

// Dimensione della seconda lingua rispetto alla prima, in percentuale.
export const SECOND_LANGUAGE_SCALE = { min: 50, max: 90, default: 70 };

export function clampSecondScale(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return SECOND_LANGUAGE_SCALE.default;
  return Math.round(Math.max(SECOND_LANGUAGE_SCALE.min, Math.min(SECOND_LANGUAGE_SCALE.max, parsed)));
}

// centerY: centro della fascia del testo (come per una lingua sola).
// Con la seconda lingua il blocco cresce verso il basso se il testo è in alto, verso l'alto se è
// in basso, in entrambe le direzioni se è al centro: la prima lingua resta dove l'utente la aspetta.
export function layoutStageText({ lineCount, secondLineCount = 0, fontPx, secondScale = SECOND_LANGUAGE_SCALE.default, centerY, verticalAlign = 'center' }) {
  const primaryLineHeight = fontPx * LINE_HEIGHT;
  const primaryHeight = lineCount * primaryLineHeight;
  const hasSecond = lineCount > 0 && secondLineCount > 0;
  const secondFontPx = fontPx * (clampSecondScale(secondScale) / 100);
  const secondLineHeight = secondFontPx * LINE_HEIGHT;
  // Sotto il trattino un po' più di spazio che sopra: la prima riga ha sotto le discendenti
  // (g, p…), la seconda sopra le maiuscole; con spazi uguali il trattino sembra attaccato alla seconda.
  const gapAbove = fontPx * 0.42;
  const gapBelow = fontPx * 0.6;
  const totalHeight = primaryHeight + (hasSecond ? gapAbove + gapBelow + secondLineCount * secondLineHeight : 0);

  let top = centerY - primaryHeight / 2;
  if (hasSecond && verticalAlign === 'bottom') top = centerY + primaryHeight / 2 - totalHeight;
  else if (hasSecond && verticalAlign !== 'top') top = centerY - totalHeight / 2;

  const primaryY = Array.from({ length: lineCount }, (_, index) => top + primaryLineHeight * (index + 0.5));
  if (!hasSecond) return { primaryY, secondY: [], separator: null, secondFontPx };

  const separatorY = top + primaryHeight + gapAbove;
  const secondY = Array.from({ length: secondLineCount }, (_, index) => separatorY + gapBelow + secondLineHeight * (index + 0.5));
  return {
    primaryY,
    secondY,
    secondFontPx,
    separator: { y: separatorY, width: fontPx * 1.1, thickness: Math.max(2, fontPx * 0.045) },
  };
}
