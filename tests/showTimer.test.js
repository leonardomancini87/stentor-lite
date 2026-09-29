import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPerformance,
  changeSection,
  createTimer,
  finishTimer,
  formatDuration,
  getElapsed,
  getSectionElapsed,
  normalizePerformances,
  pauseTimer,
  startTimer,
} from '../src/utils/showTimer.js';
import { normalizeProject } from '../src/utils/projectSchema.js';

const atto1 = { id: 'a1', title: 'Atto I' };
const intervallo = { id: 'int', title: 'Intervallo' };
const atto2 = { id: 'a2', title: 'Atto II' };

test('il cronometro parte solo con Avvia', () => {
  let timer = createTimer(atto1);
  assert.equal(getElapsed(timer, 5000), 0);
  timer = changeSection(timer, atto2, 6000);
  assert.equal(timer.section.id, 'a2');
  assert.deepEqual(timer.segments, []);
});

test('pausa congela totale e sezione', () => {
  let timer = startTimer(createTimer(atto1), 1000);
  assert.equal(getElapsed(timer, 4000), 3000);
  timer = pauseTimer(timer, 4000);
  assert.equal(getElapsed(timer, 99000), 3000);
  assert.equal(getSectionElapsed(timer, 99000), 3000);
  timer = startTimer(timer, 100000);
  assert.equal(getElapsed(timer, 101000), 4000);
});

test('le sezioni vengono misurate e registrate a fine recita', () => {
  let timer = startTimer(createTimer(atto1), 0);
  timer = changeSection(timer, intervallo, 60000);
  assert.equal(getSectionElapsed(timer, 70000), 10000);
  timer = changeSection(timer, atto2, 75000);
  timer = changeSection(timer, atto1, 80000); // tornati indietro per errore
  timer = changeSection(timer, atto2, 81000);
  const { timer: reset, performance } = finishTimer(timer, 141000);
  assert.equal(reset.status, 'idle');
  assert.equal(reset.section.id, 'a2');
  assert.equal(performance.totalMs, 141000);
  assert.deepEqual(performance.sections, [
    { title: 'Atto I', ms: 61000 },
    { title: 'Intervallo', ms: 15000 },
    { title: 'Atto II', ms: 65000 },
  ]);
});

test('senza marcatori resta solo il totale', () => {
  const timer = startTimer(createTimer(null), 0);
  const { performance } = finishTimer(timer, 5000);
  assert.equal(performance.totalMs, 5000);
  assert.deepEqual(performance.sections, []);
  assert.equal(finishTimer(createTimer(null), 1).performance, null);
});

test('registro recite: le più recenti prima, al massimo dieci, salvato nel progetto', () => {
  let list = [];
  for (let i = 0; i < 12; i += 1) list = addPerformance(list, { id: `r${i}`, totalMs: i * 1000, sections: [] });
  assert.equal(list.length, 10);
  assert.equal(list[0].id, 'r11');
  assert.deepEqual(normalizePerformances([{ totalMs: 'x' }, null]), []);
  const project = normalizeProject({ cues: [], performances: [{ id: 'r1', startedAt: 1, endedAt: 2, totalMs: 1234.4, sections: [{ title: 'Atto I', ms: 1000 }] }] });
  assert.equal(project.performances[0].totalMs, 1234);
});

test('formato durate', () => {
  assert.equal(formatDuration(65000), '01:05');
  assert.equal(formatDuration(3725000), '1:02:05');
  assert.equal(formatDuration(5000, { alwaysHours: true }), '0:00:05');
});


import { clearCueTimings, closeCueTiming, countTimedCues, cueHasTime, stampCueChange } from '../src/utils/showTimer.js';

test('tempi delle battute: ogni cambio salva inizio e fine', () => {
  const cues = [{ id: 1 }, { id: 2 }, { id: 9, type: 'marker' }, { id: 3, startTime: 99, endTime: 120 }];
  let next = stampCueChange(cues, -1, 0, 0);
  assert.equal(next[0].startTime, 0);
  next = stampCueChange(next, 0, 1, 4.567);
  assert.deepEqual([next[0].endTime, next[1].startTime], [4.57, 4.57]);
  next = stampCueChange(next, 1, 3, 10);
  assert.deepEqual([next[1].endTime, next[3].startTime, next[3].endTime], [10, 10, null]);
  assert.equal(next[2].startTime, undefined);
  next = closeCueTiming(next, 3, 15);
  assert.equal(next[3].endTime, 15);
  assert.deepEqual(countTimedCues(next), { timed: 3, total: 3 });
  assert.equal(cueHasTime(next[0]), true);
  assert.equal(cueHasTime({ startTime: null }), false);
  assert.deepEqual(countTimedCues(clearCueTimings(next)), { timed: 0, total: 3 });
});
