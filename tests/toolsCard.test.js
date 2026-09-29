import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanCues, cleanText, DEFAULT_CLEANUP } from '../src/utils/textCleanup.js';
import { buildTextCheck, describeCue, getCueProblems, getLineLimit, nextIndexAfter, normalizeLineLimit } from '../src/utils/textCheck.js';

test('pulizia: spazi e righe vuote (attive di partenza)', () => {
  assert.equal(cleanText('  Ciao  mondo ,  come va ?  \n\n\n\nBene', DEFAULT_CLEANUP), 'Ciao mondo, come va?\nBene');
  assert.equal(cleanText('Prima\n   \nSeconda', { emptyLines: true }), 'Prima\nSeconda');
  assert.equal(cleanText("l'amore...", DEFAULT_CLEANUP), "l'amore...");
});

test('pulizia: tipografia solo se scelta', () => {
  assert.equal(cleanText("l'amore... e poi", { typography: true }), 'l’amore… e poi');
});

test('pulizia: in francese lo spazio davanti a ; : ! ? diventa unificatore', () => {
  assert.equal(cleanText('Bonjour ! Ça va?  Oui , merci :', { spaces: true }, 'fr'), 'Bonjour ! Ça va ? Oui, merci :');
  assert.equal(cleanText('Ciao ! Come va ?', { spaces: true }, 'it'), 'Ciao! Come va?');
});

test('pulizia: una sola battuta o tutto il copione, marcatori esclusi', () => {
  const cues = [
    { id: 1, translations: { it: 'Ciao  a tutti', en: 'Hi  all' } },
    { id: 2, type: 'marker', title: 'Atto  II', translations: { it: '' } },
    { id: 3, translations: { it: 'Addio ,' } },
  ];
  const one = cleanCues(cues, DEFAULT_CLEANUP, { onlyCueId: 3 });
  assert.equal(one.changedCues, 1);
  assert.equal(one.cues[0], cues[0]);
  assert.equal(one.cues[2].translations.it, 'Addio,');
  const all = cleanCues(cues, DEFAULT_CLEANUP);
  assert.equal(all.changedCues, 2);
  assert.equal(all.cues[0].translations.en, 'Hi all');
  assert.equal(all.cues[1], cues[1]);
});

test('verifica: problemi per battuta', () => {
  assert.deepEqual(getCueProblems({ translations: { it: '' } }, 'it'), ['missing']);
  assert.deepEqual(getCueProblems({ translations: { it: 'a\nb\nc' } }, 'it'), ['lines']);
  assert.deepEqual(getCueProblems({ translations: { it: 'x'.repeat(50) } }, 'it'), ['long']);
  assert.deepEqual(getCueProblems({ translations: { it: 'Ciao ,  tu' } }, 'it'), ['spacing']);
  assert.deepEqual(getCueProblems({ translations: { it: 'Tutto bene.' } }, 'it'), []);
  assert.deepEqual(getCueProblems({ translations: { fr: 'Bonjour ! Ça va ?' } }, 'fr'), []);
  assert.deepEqual(getCueProblems({ type: 'marker' }, 'it'), []);
});

test('verifica: riepilogo, contrasto e prossima battuta da sistemare', () => {
  const cues = [
    { id: 1, translations: { it: '' } },
    { id: 2, type: 'marker' },
    { id: 3, translations: { it: 'Va bene.' } },
    { id: 4, translations: { it: '' } },
  ];
  const report = buildTextCheck(cues, 'it', { text: '#F3E7B3', background: '#000000' });
  assert.deepEqual(report.items.map((item) => [item.id, item.indexes]), [['missing', [0, 3]]]);
  assert.equal(report.total, 3);
  assert.equal(report.contrast, 'ok');
  assert.equal(report.clean, false);
  assert.equal(buildTextCheck(cues, 'it', { text: '#777777', background: '#666666' }).contrast, 'error');
  assert.equal(nextIndexAfter([0, 3], 0), 3);
  assert.equal(nextIndexAfter([0, 3], 3), 0);
  assert.equal(nextIndexAfter([], 0), -1);
  assert.deepEqual(describeCue({ translations: { it: 'Due\nrighe' } }, 'it'), { lineCount: 2, totalChars: 9, charsPerLine: [3, 5] });
});

test('limite di caratteri per riga impostabile nel progetto', () => {
  assert.equal(getLineLimit({}), 42);
  assert.equal(getLineLimit({ settings: { maxCharsPerLine: 37 } }), 37);
  assert.equal(normalizeLineLimit(5), 20);
  assert.equal(normalizeLineLimit(200), 80);
  assert.equal(normalizeLineLimit('abc'), 42);
  const cue = { translations: { it: 'x'.repeat(40) } };
  assert.deepEqual(getCueProblems(cue, 'it', 42), []);
  assert.deepEqual(getCueProblems(cue, 'it', 37), ['long']);
  const report = buildTextCheck([cue], 'it', {}, 37);
  assert.equal(report.items[0].detail, 'Più di 37 caratteri in una riga o 74 in tutto.');
});
