import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProject, refreshBuiltInDemo } from '../src/utils/projectPersistence.js';
import { demoProject } from '../src/lib/demoProject.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const ARCHIVE_KEY = 'stentore.projectArchive.v1';
const CURRENT_ID_KEY = 'stentore.currentProjectId.v1';

test('demo: una copia salvata vecchia viene sostituita, gli altri progetti restano', () => {
  globalThis.localStorage = memoryStorage();
  const oldDemo = { ...demoProject, demoVersion: undefined, title: 'Antigone vecchia', cues: [{ id: 1, speaker: 'X', original: 'vecchia', translations: {}, renderStyle: 'italic' }] };
  const mine = { id: 'mio', title: 'Il mio spettacolo', languages: ['it'], cues: [{ id: 1, speaker: 'A', original: 'ciao', translations: {} }] };
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify([oldDemo, mine]));
  localStorage.setItem(CURRENT_ID_KEY, demoProject.id);

  assert.equal(refreshBuiltInDemo(demoProject), true);

  const archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY));
  assert.equal(archive.length, 2);
  assert.equal(archive.find((p) => p.id === demoProject.id).title, demoProject.title);
  assert.equal(archive.find((p) => p.id === 'mio').title, 'Il mio spettacolo');
  assert.equal(loadProject().cues.length, demoProject.cues.length);
  assert.ok(loadProject().cues.every((cue) => cue.renderStyle !== 'italic'));

  // Seconda apertura: la demo non viene più toccata, le modifiche restano.
  const edited = archive.map((p) => (p.id === demoProject.id ? { ...p, title: 'Antigone modificata' } : p));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(edited));
  assert.equal(refreshBuiltInDemo(demoProject), false);
  assert.equal(JSON.parse(localStorage.getItem(ARCHIVE_KEY)).find((p) => p.id === demoProject.id).title, 'Antigone modificata');
});

test('demo: su un computer senza progetti salvati non succede nulla', () => {
  globalThis.localStorage = memoryStorage();
  assert.equal(refreshBuiltInDemo(demoProject), false);
  assert.equal(localStorage.getItem(ARCHIVE_KEY), null);
});
