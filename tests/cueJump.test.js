import test from 'node:test';
import assert from 'node:assert/strict';

import { getCueJumpState } from '../src/utils/cueJump.js';

const cues = [
  { id: 1, translations: { it: 'Prima' } },
  { id: 2, type: 'marker', markerType: 'act', translations: { it: 'Atto secondo' } },
  { id: 3, translations: { it: 'Seconda' } },
  { id: 4, translations: { it: 'Terza' } },
];

test('il doppio click su una battuta la rende corrente, selezionata e senza schermo pulito', () => {
  assert.deepEqual(getCueJumpState(cues, 3), {
    projectedIndex: 3,
    activeIndex: 3,
    blackout: false,
  });
});

test('il salto funziona sia in avanti sia indietro rispetto alla battuta corrente', () => {
  assert.equal(getCueJumpState(cues, 0).projectedIndex, 0);
  assert.equal(getCueJumpState(cues, 2).projectedIndex, 2);
});

test('il salto non è possibile su marcatori o indici non validi', () => {
  assert.equal(getCueJumpState(cues, 1), null);
  assert.equal(getCueJumpState(cues, -1), null);
  assert.equal(getCueJumpState(cues, 4), null);
  assert.equal(getCueJumpState(cues, 1.5), null);
  assert.equal(getCueJumpState(cues, undefined), null);
  assert.equal(getCueJumpState(null, 0), null);
});
