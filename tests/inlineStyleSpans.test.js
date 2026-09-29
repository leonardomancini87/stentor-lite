import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyStylePatchToRange,
  clearStyleRange,
  getCueTextSpans,
  getRangePropertyState,
  getRangeValue,
  mergeTextAndSpans,
  normalizeCueTextSpans,
  normalizeTextSpans,
  segmentTextBySpans,
  splitTextAndSpans,
  transformSpansForTextEdit,
} from '../src/utils/inlineStyleSpans.js';
import { normalizeProject } from '../src/utils/projectSchema.js';
import { buildProjectionPayload } from '../src/utils/projectionTargets.js';
import { mergeCueWithNextStructural, splitCueAtCursorStructural } from '../src/utils/cueStructure.js';

const screen = { id: 'screen-1', name: 'Schermo 1', language: 'it' };

test('local styles: apply bold to a range without changing the text', () => {
  const spans = applyStylePatchToRange([], 2, 9, { bold: true }, 20);
  assert.deepEqual(spans, [{ start: 2, end: 9, bold: true }]);
});

test('local styles: explicit false can override a cue-level true value', () => {
  const spans = applyStylePatchToRange([], 2, 9, { italic: false }, 20);
  assert.equal(getRangePropertyState(spans, 2, 9, 'italic', true, 20), 'off');
});

test('local styles: underline is independent from bold and italic', () => {
  let spans = applyStylePatchToRange([], 0, 5, { bold: true }, 10);
  spans = applyStylePatchToRange(spans, 2, 8, { underline: true }, 10);
  const segments = segmentTextBySpans('abcdefghij', spans);
  assert.equal(segments.some((segment) => segment.bold && segment.underline), true);
  assert.equal(segments.some((segment) => !segment.bold && segment.underline), true);
});

test('local styles: color is normalized and queryable', () => {
  const spans = applyStylePatchToRange([], 1, 4, { color: '#f3e7b3' }, 5);
  assert.equal(getRangeValue(spans, 1, 4, 'color', null, 5), '#F3E7B3');
});

test('local styles: font scale is clamped to safe bounds', () => {
  const low = applyStylePatchToRange([], 0, 2, { fontScale: 0.2 }, 4);
  const high = applyStylePatchToRange([], 2, 4, { fontScale: 4 }, 4);
  assert.equal(low[0].fontScale, 0.8);
  assert.equal(high[0].fontScale, 1.3);
});

test('local styles: clear formatting affects only the selected range', () => {
  const spans = [{ start: 0, end: 10, bold: true, italic: true }];
  const cleared = clearStyleRange(spans, 3, 7, 10);
  assert.deepEqual(cleared, [
    { start: 0, end: 3, bold: true, italic: true },
    { start: 7, end: 10, bold: true, italic: true },
  ]);
});

test('local styles: adjacent equivalent ranges normalize into one', () => {
  assert.deepEqual(normalizeTextSpans([
    { start: 0, end: 3, bold: true },
    { start: 3, end: 6, bold: true },
  ], 6), [{ start: 0, end: 6, bold: true }]);
});

test('local styles: overlapping sparse ranges combine safely', () => {
  const spans = normalizeTextSpans([
    { start: 0, end: 6, bold: true },
    { start: 2, end: 4, italic: true },
  ], 6);
  assert.deepEqual(spans, [
    { start: 0, end: 2, bold: true },
    { start: 2, end: 4, bold: true, italic: true },
    { start: 4, end: 6, bold: true },
  ]);
});

test('local styles: inserting text before a styled range shifts offsets', () => {
  const spans = transformSpansForTextEdit([{ start: 2, end: 9, italic: true }], 'O Fortuna', 'XYZO Fortuna');
  assert.deepEqual(spans, [{ start: 5, end: 12, italic: true }]);
});

test('local styles: typing inside a styled range inherits its style', () => {
  const spans = transformSpansForTextEdit([{ start: 2, end: 9, italic: true }], 'O Fortuna', 'O ForXXXtuna');
  assert.deepEqual(spans, [{ start: 2, end: 12, italic: true }]);
});

test('local styles: deleting before a styled range shifts it left', () => {
  const spans = transformSpansForTextEdit([{ start: 4, end: 8, bold: true }], 'xxabcdef', 'abcdef');
  assert.deepEqual(spans, [{ start: 2, end: 6, bold: true }]);
});

test('local styles: deleting inside a styled range shrinks it', () => {
  const spans = transformSpansForTextEdit([{ start: 2, end: 9, italic: true }], 'O Fortuna', 'O Founa');
  assert.deepEqual(spans, [{ start: 2, end: 7, italic: true }]);
});

test('local styles: deleting an entire styled range removes it', () => {
  const spans = transformSpansForTextEdit([{ start: 2, end: 9, italic: true }], 'O Fortuna!', 'O !');
  assert.deepEqual(spans, []);
});

test('local styles: replacing selected text preserves style at the replacement point', () => {
  const spans = transformSpansForTextEdit([{ start: 2, end: 9, bold: true }], 'O Fortuna', 'O Sorte');
  assert.deepEqual(spans, [{ start: 2, end: 7, bold: true }]);
});

test('local styles: split before a span moves it to the second cue', () => {
  const result = splitTextAndSpans('Ciao mondo', [{ start: 5, end: 10, italic: true }], 5);
  assert.deepEqual(result.firstSpans, []);
  assert.deepEqual(result.secondSpans, [{ start: 0, end: 5, italic: true }]);
});

test('local styles: split through a span creates two correctly rebased spans', () => {
  const result = splitTextAndSpans('abcdefghij', [{ start: 2, end: 8, underline: true }], 5);
  assert.deepEqual(result.firstSpans, [{ start: 2, end: 5, underline: true }]);
  assert.deepEqual(result.secondSpans, [{ start: 0, end: 3, underline: true }]);
});

test('local styles: split after a span keeps it in the first cue', () => {
  const result = splitTextAndSpans('Ciao mondo', [{ start: 0, end: 4, bold: true }], 5);
  assert.deepEqual(result.firstSpans, [{ start: 0, end: 4, bold: true }]);
  assert.deepEqual(result.secondSpans, []);
});

test('local styles: merge shifts spans from the second cue by text plus separator', () => {
  const result = mergeTextAndSpans('Ciao', [{ start: 0, end: 4, bold: true }], 'mondo', [{ start: 0, end: 5, italic: true }]);
  assert.equal(result.text, 'Ciao mondo');
  assert.deepEqual(result.spans, [
    { start: 0, end: 4, bold: true },
    { start: 5, end: 10, italic: true },
  ]);
});

test('local styles: languages are normalized independently', () => {
  const value = normalizeCueTextSpans({
    it: [{ start: 0, end: 4, bold: true }],
    en: [{ start: 0, end: 3, italic: true }],
  }, { it: 'Ciao', en: 'Hi!' });
  assert.deepEqual(value.it, [{ start: 0, end: 4, bold: true }]);
  assert.deepEqual(value.en, [{ start: 0, end: 3, italic: true }]);
});

test('local styles: old projects without spans normalize without migration', () => {
  const project = normalizeProject({ title: 'Legacy', languages: ['it'], activeLanguage: 'it', cues: [{ id: 1, translations: { it: 'Ciao' } }] });
  assert.deepEqual(project.cues[0].textSpans, {});
});

test('local styles: project normalization clamps invalid legacy offsets', () => {
  const project = normalizeProject({
    languages: ['it'], activeLanguage: 'it',
    cues: [{ id: 1, translations: { it: 'Ciao' }, textSpans: { it: [{ start: -4, end: 99, bold: true }] } }],
  });
  assert.deepEqual(project.cues[0].textSpans.it, [{ start: 0, end: 4, bold: true }]);
});

test('local styles: projection payload carries spans separately from plain text', () => {
  const cue = { id: 1, translations: { it: 'Ciao' }, textSpans: { it: [{ start: 0, end: 4, color: '#FF0000' }] } };
  const payload = buildProjectionPayload({ cue, screen, activeLanguage: 'it', languages: ['it'] });
  assert.equal(payload.text, 'Ciao');
  assert.deepEqual(payload.textSpans, [{ start: 0, end: 4, color: '#FF0000' }]);
  assert.equal(payload.text.includes('<'), false);
});

test('local styles: structural split preserves local formatting', () => {
  const project = { languages: ['it'], activeLanguage: 'it', cues: [{ id: 1, speaker: '', translations: { it: 'Ciao mondo' }, textSpans: { it: [{ start: 5, end: 10, italic: true }] } }] };
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 5, fullText: 'Ciao mondo' });
  assert.equal(result.project.cues[0].translations.it, 'Ciao');
  assert.equal(result.project.cues[1].translations.it, 'mondo');
  assert.deepEqual(result.project.cues[1].textSpans.it, [{ start: 0, end: 5, italic: true }]);
});

test('local styles: structural merge preserves and shifts local formatting', () => {
  const project = { languages: ['it'], cues: [
    { id: 1, translations: { it: 'Ciao' }, textSpans: { it: [{ start: 0, end: 4, bold: true }] } },
    { id: 2, translations: { it: 'mondo' }, textSpans: { it: [{ start: 0, end: 5, italic: true }] } },
  ] };
  const result = mergeCueWithNextStructural(project, 1);
  assert.equal(result.project.cues[0].translations.it, 'Ciao mondo');
  assert.deepEqual(result.project.cues[0].textSpans.it, [
    { start: 0, end: 4, bold: true },
    { start: 5, end: 10, italic: true },
  ]);
});

test('local styles: getCueTextSpans returns only the requested language', () => {
  const cue = { translations: { it: 'Ciao', en: 'Hello' }, textSpans: { it: [{ start: 0, end: 4, bold: true }], en: [{ start: 0, end: 5, italic: true }] } };
  assert.deepEqual(getCueTextSpans(cue, 'en'), [{ start: 0, end: 5, italic: true }]);
});
