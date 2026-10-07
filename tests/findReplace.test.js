import test from 'node:test';
import assert from 'node:assert/strict';

import { findInCues, replaceInCues } from '../src/utils/findReplace.js';

const cues = [
  { id: 'm', type: 'marker', title: 'Creonte entra' },
  { id: 1, speaker: 'CREONTE', translations: { it: 'Creonte parla. creonte tace.', en: 'Creon speaks.' }, note: 'Creonte a sinistra' },
  { id: 2, translations: { it: 'Antigone risponde.' } },
  { id: 3, original: 'Creonte esce.', translations: {} },
];

test('trova: conta le occorrenze nella lingua di lavoro, senza toccare note, voci e segnalibri', () => {
  assert.deepEqual(findInCues(cues, 'it', 'creonte', { primaryLanguage: 'it' }), { total: 3, indexes: [1, 3] });
  assert.deepEqual(findInCues(cues, 'it', 'creonte', { caseSensitive: true }), { total: 1, indexes: [1] });
  // In una lingua non principale una battuta non tradotta non ha testo: l'originale non si tocca.
  assert.deepEqual(findInCues(cues, 'en', 'Creon', { primaryLanguage: 'it' }), { total: 1, indexes: [1] });
  assert.deepEqual(findInCues(cues, 'it', ''), { total: 0, indexes: [] });
  // I caratteri speciali si cercano alla lettera.
  assert.deepEqual(findInCues([{ id: 9, translations: { it: 'Che ora è? (tardi)' } }], 'it', '? ('), { total: 1, indexes: [0] });
});

test('sostituisci: cambia solo il testo nella lingua scelta', () => {
  const result = replaceInCues(cues, 'it', 'creonte', 'Kreon', { primaryLanguage: 'it' });
  assert.equal(result.replaced, 3);
  assert.equal(result.changedCues, 2);
  assert.equal(result.cues[1].translations.it, 'Kreon parla. Kreon tace.');
  assert.equal(result.cues[1].translations.en, 'Creon speaks.');
  assert.equal(result.cues[1].note, 'Creonte a sinistra');
  assert.equal(result.cues[1].speaker, 'CREONTE');
  assert.equal(result.cues[0].title, 'Creonte entra');
  assert.equal(result.cues[3].original, 'Kreon esce.');
  // Le battute senza occorrenze restano lo stesso oggetto: nessuna modifica inutile.
  assert.equal(result.cues[2], cues[2]);
});

test('sostituisci: testo inserito alla lettera, anche vuoto o con simboli', () => {
  const one = [{ id: 1, translations: { it: 'Prezzo: X euro' } }];
  assert.equal(replaceInCues(one, 'it', 'X', '$1 & $&').cues[0].translations.it, 'Prezzo: $1 & $& euro');
  assert.equal(replaceInCues(one, 'it', ' euro', '').cues[0].translations.it, 'Prezzo: X');
  assert.deepEqual(replaceInCues(one, 'it', 'assente', 'x'), { cues: one, replaced: 0, changedCues: 0 });
});

test('sostituisci: la formattazione segue il testo', () => {
  const styled = [{ id: 1, translations: { it: 'Il re Creonte parla' }, textSpans: { it: [{ start: 14, end: 19, bold: true }] } }];
  const result = replaceInCues(styled, 'it', 'Creonte', 'Kreon');
  assert.equal(result.cues[0].translations.it, 'Il re Kreon parla');
  const [span] = result.cues[0].textSpans.it;
  assert.equal(result.cues[0].translations.it.slice(span.start, span.end), 'parla');
});
