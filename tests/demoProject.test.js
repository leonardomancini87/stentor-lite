import test from 'node:test';
import assert from 'node:assert/strict';

import { demoProject } from '../src/lib/demoProject.js';
import { getCueProblems } from '../src/utils/textCheck.js';
import { isMarkerCue } from '../src/utils/markers.js';

test('la demo Antigone ha tre parti e battute in tre lingue', () => {
  const markers = demoProject.cues.filter(isMarkerCue);
  const cues = demoProject.cues.filter((cue) => !isMarkerCue(cue));
  assert.deepEqual(markers.map((cue) => cue.title), ['Prologo', 'Parodo', 'Primo episodio']);
  assert.equal(cues.length, 22);
  for (const cue of cues) {
    for (const language of demoProject.languages) {
      assert.ok(cue.translations[language], `battuta ${cue.id} senza testo in ${language}`);
    }
  }
  const ids = demoProject.cues.map((cue) => cue.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('la demo supera la verifica del testo in tutte le lingue', () => {
  for (const cue of demoProject.cues.filter((item) => !isMarkerCue(item))) {
    for (const language of demoProject.languages) {
      assert.deepEqual(getCueProblems(cue, language), [], `battuta ${cue.id} (${language})`);
    }
  }
});

test('i tempi registrati della demo sono in ordine', () => {
  const times = demoProject.cues.filter((cue) => !isMarkerCue(cue)).map((cue) => cue.startTime);
  times.forEach((time, index) => {
    if (index > 0) assert.ok(time > times[index - 1]);
  });
});
