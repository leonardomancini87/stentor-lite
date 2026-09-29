import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeStageCommand } from '../src/utils/stageCommands.js';
import { findCueIndexByTime } from '../src/hooks/useTimedPlayback.js';

test('stage commands: keys pressed in the projection window become actions', () => {
  assert.deepEqual(normalizeStageCommand({ id: 'a1', comando: 'avanti' }), { id: 'a1', action: 'next' });
  assert.deepEqual(normalizeStageCommand(JSON.stringify({ id: 'a2', comando: 'indietro' })), { id: 'a2', action: 'previous' });
  assert.deepEqual(normalizeStageCommand({ comando: 'alterna_buio' }), { id: null, action: 'toggleBlackout' });
});

test('stage commands: anything else is ignored', () => {
  assert.equal(normalizeStageCommand({ comando: 'lingua', lingua: 'fr' }), null);
  assert.equal(normalizeStageCommand('not json'), null);
  assert.equal(normalizeStageCommand(null), null);
});

test('timed playback: finds the cue to project at a given time, skipping markers', () => {
  const cues = [
    { type: 'marker', startTime: 0 },
    { startTime: 1, endTime: 3 },
    { startTime: 4 },
    { startTime: 9 },
  ];
  assert.equal(findCueIndexByTime(cues, 0.5), -1);
  assert.equal(findCueIndexByTime(cues, 2), 1);
  assert.equal(findCueIndexByTime(cues, 3.5), -1);
  assert.equal(findCueIndexByTime(cues, 5), 2);
  assert.equal(findCueIndexByTime(cues, 100), 3);
});
