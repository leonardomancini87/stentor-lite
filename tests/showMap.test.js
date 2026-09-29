import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildShowMap,
  findIndexByCueNumber,
  findMarkerTargetByText,
  findSectionForIndex,
  formatCueNumber,
  getCueNumbers,
  shiftIndexAfterInsert,
  shiftIndexAfterRemove,
  suggestMarkerTitle,
  toRoman,
} from '../src/utils/showMap.js';

const cues = [
  { id: 1 },
  { id: 2 },
  { id: 10, type: 'marker', markerType: 'act', title: 'Atto II' },
  { id: 3 },
  { id: 11, type: 'marker', markerType: 'interval', title: 'Intervallo' },
  { id: 12, type: 'marker', markerType: 'act', title: 'Atto III' },
  { id: 4 },
  { id: 5 },
];

test('le battute sono numerate senza contare i marcatori', () => {
  assert.deepEqual(getCueNumbers(cues), [1, 2, null, 3, null, null, 4, 5]);
  assert.equal(formatCueNumber(4), '004');
  assert.equal(formatCueNumber(null), '—');
});

test('il numero di battuta porta alla posizione giusta', () => {
  assert.equal(findIndexByCueNumber(cues, 3), 3);
  assert.equal(findIndexByCueNumber(cues, 4), 6);
  assert.equal(findIndexByCueNumber(cues, 9), -1);
  assert.equal(findIndexByCueNumber(cues, 0), -1);
});

test('la mappa elenca le sezioni con la sezione implicita Inizio', () => {
  const map = buildShowMap(cues);
  assert.deepEqual(
    map.map((s) => [s.title, s.firstCueIndex, s.firstNumber, s.lastNumber, s.cueCount]),
    [
      ['Inizio', 0, 1, 2, 2],
      ['Atto II', 3, 3, 3, 1],
      ['Intervallo', -1, null, null, 0],
      ['Atto III', 6, 4, 5, 2],
    ],
  );
});

test('senza marcatori la mappa è vuota', () => {
  assert.deepEqual(buildShowMap([{ id: 1 }, { id: 2 }]), []);
  assert.deepEqual(buildShowMap([]), []);
});

test('la sezione corrente segue la battuta proiettata', () => {
  const map = buildShowMap(cues);
  assert.equal(findSectionForIndex(map, 1).title, 'Inizio');
  assert.equal(findSectionForIndex(map, 3).title, 'Atto II');
  assert.equal(findSectionForIndex(map, 7).title, 'Atto III');
});

test('il titolo proposto continua la numerazione del tipo', () => {
  assert.equal(toRoman(4), 'IV');
  assert.equal(suggestMarkerTitle(cues, 'act', 2), 'Atto II');
  assert.equal(suggestMarkerTitle(cues, 'act', cues.length), 'Atto IV');
  assert.equal(suggestMarkerTitle(cues, 'scene', 0), 'Scena I');
  // Battute già presenti prima del primo atto: quelle sono il primo atto.
  assert.equal(suggestMarkerTitle([{ id: 1 }, { id: 2 }, { id: 3 }], 'act', 2), 'Atto II');
  assert.equal(suggestMarkerTitle([{ id: 1 }, { id: 2 }], 'act', 0), 'Atto I');
  assert.equal(suggestMarkerTitle(cues, 'interval'), 'Intervallo');
  assert.equal(suggestMarkerTitle(cues, 'other'), 'Marcatore');
});

test('gli indici vengono corretti dopo inserimenti e rimozioni', () => {
  assert.equal(shiftIndexAfterInsert(3, 3), 4);
  assert.equal(shiftIndexAfterInsert(2, 3), 2);
  assert.equal(shiftIndexAfterRemove(5, 3), 4);
  assert.equal(shiftIndexAfterRemove(2, 3), 2);
});

test('Vai a trova un marcatore per titolo, anche con numeri arabi', () => {
  assert.equal(findMarkerTargetByText(cues, 'atto 3'), 6);
  assert.equal(findMarkerTargetByText(cues, 'Atto II'), 3);
  assert.equal(findMarkerTargetByText(cues, 'intervallo'), -1); // nessuna battuta dentro
  assert.equal(findMarkerTargetByText(cues, 'finale'), -1);
});
