import test from 'node:test';
import assert from 'node:assert/strict';

import { applyItalicMarkup, parseInlineFormatting, stripInlineFormatting } from '../src/utils/inlineFormatting.js';
import { getSubtitleStats } from '../src/utils/subtitleStats.js';

test('applica corsivo alla selezione senza alterare il resto del testo', () => {
  const result = applyItalicMarkup('Buongiorno a tutti', 0, 10);
  assert.equal(result.value, '<i>Buongiorno</i> a tutti');
});

test('riconosce segmenti in corsivo inline', () => {
  const segments = parseInlineFormatting('Buon <i>giorno</i>.');
  assert.deepEqual(segments, [
    { text: 'Buon ', italic: false, bold: false, underline: false, strike: false, subscript: false, superscript: false },
    { text: 'giorno', italic: true, bold: false, underline: false, strike: false, subscript: false, superscript: false },
    { text: '.', italic: false, bold: false, underline: false, strike: false, subscript: false, superscript: false },
  ]);
});

test('le statistiche ignorano i marcatori di corsivo inline', () => {
  const text = 'Buon <i>giorno</i>.';
  assert.equal(stripInlineFormatting(text), 'Buon giorno.');
  assert.equal(getSubtitleStats(text).totalChars, 12);
});
